<!-- eslint-disable no-console -->
<script setup lang="ts">
import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import type Lenis from 'lenis'
import { keyBy, objectPick, randomStr, sleep, uniquePromise } from '@namesmt/utils'
import { api } from 'backend-convex/convex/_generated/api'
import { useConvexClient } from 'convex-vue'
import { countdown, debounce, getInstance, throttle } from 'kontroll'
import { VueLenis } from 'lenis/vue'
import { useToast } from '~/lib/shadcn/components/ui/toast'

const { $auth } = useNuxtApp()
const convex = useConvexClient()
const chatContext = useChatContext()
const { toast } = useToast()
const { t } = useI18n()

// Lenis have bug with useTemplateRef
const lenisRef = ref<{ $el: HTMLElement, lenis: Lenis }>()
const { y: scrollY } = useScroll(computed(() => lenisRef.value?.$el))
const nearTopBottom = computed(() => {
  const el = lenisRef.value?.$el
  const lenis = lenisRef.value?.lenis
  if (!el || !lenis)
    return [null, null]

  const currentScroll = Math.ceil(lenis.targetScroll || scrollY.value)

  const gapFromTop = currentScroll
  const gapFromBottom = el.scrollHeight - el.clientHeight - currentScroll

  const nearTop = gapFromTop < 369
  const nearBottom = gapFromBottom < 369
  return [nearTop && gapFromTop + 1, nearBottom && gapFromBottom + 1, lenis.targetScroll, scrollY.value]
})

const threadIdRef = useThreadIdRef()
const isThreadFrozen = computed(() => chatContext.activeThread.value?.frozen)
const fetchKey = ref(0)

const sendMessageRef = useRouteQuery<string | undefined>('sendMessage')
whenever(
  sendMessageRef,
  (v) => {
    handleSubmit({ input: v, files: [] })
    sendMessageRef.value = undefined
  },
  { immediate: true },
)

const cachedThreadsMessages: {
  [threadId: string]: Array<CustomMessage>
} = {}
const messages = ref<Array<CustomMessage>>([])
const messagesKeyed = computed(() => keyBy(messages.value, 'id'))
const streamingMessagesMap = reactive<Record<string, true>>({ })
const isFetching = ref(false)
const chatInput = ref('')

// Fetch messages as needed and resume streams
const { ignoreUpdates: ignorePathUpdate } = watchIgnorable(
  [threadIdRef, fetchKey],
  async ([threadId], [oldThreadId]) => {
    if (oldThreadId)
      cachedThreadsMessages[oldThreadId] = messages.value

    messages.value = cachedThreadsMessages[threadId as string] ?? []

    nextTick(() => { doScrollBottom({ smooth: false, maybe: true }) })

    if (threadId) {
      isFetching.value = true
      await convex.query(api.messages.listByThread, { threadId: threadId as Doc<'threads'>['_id'], lockerKey: getLockerKey(threadId) })
        .then((messagesFromConvex) => {
          if (threadIdRef.value === threadId) {
            if (threadId === oldThreadId) {
              for (const index in messagesFromConvex) {
                const m = messagesFromConvex[index]!
                if (m.streamId && !streamingMessagesMap[m.streamId]) {
                  messages.value.push(customMessageTransform(messagesFromConvex[+index - 1]!))
                  messages.value.push(customMessageTransform(m))
                }
              }
            }
            else {
              messages.value = messagesFromConvex.map(customMessageTransform)
            }
          }
        })
        .catch((e) => {
          console.error('Failed to fetch messages:', e)
          messages.value = []

          // If the owner have deleted the thread, remove it locally
          // (or the demo crons cleaned it)
          if (getConvexErrorMessage(e) === 'Thread not found') {
            toast({ variant: 'destructive', description: t('chat.toast.threadRemovedExternal') })

            const foundAt = chatContext.threads.value.findIndex(t => t._id === threadId)
            if (foundAt !== -1)
              chatContext.threads.value.splice(foundAt, 1)
          }
        })
        .finally(() => {
          if (threadIdRef.value === threadId)
            isFetching.value = false
        })

      // Check for unfinished streams to resume
      for (const message of messages.value) {
        if (
          message.role === 'assistant'
          && message.isStreaming
          && message.streamId
        ) {
          console.log('Attempting to resume stream for session:', message.streamId)
          nextTick(() => { uniquePromise(message.streamId!, () => resumeStreamToMessage(message.streamId!, message.id)) })
        }
      }

      if (threadId !== oldThreadId)
        nextTick(() => doScrollBottom({ tries: 6 }))
    }
  },
  { immediate: true },
)

// Efficient concurrent syncing support using counter Query.
watchImmediate(threadIdRef, (threadId) => {
  if (!threadId)
    return

  console.log(`Subscribing to: ${threadId}`)
  const { unsubscribe } = convex.onUpdate(
    api.messages.countByThread,
    { threadId: threadId as Id<'threads'>, lockerKey: getLockerKey(threadId) },
    (count) => {
      if (count > messages.value.length)
        debounce(100, () => { ++fetchKey.value })
    },
  )
  watchOnce(threadIdRef, () => {
    unsubscribe()
    console.log(`Unsubscribed from: ${threadId}`)
  })
})

interface HandleSubmitArgs {
  input: string
  files: File[]
}
async function handleSubmit({ input, files }: HandleSubmitArgs) {
  const userInput = input.trim()
  if (!userInput && !files.length)
    return

  if (isThreadFrozen.value) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (!lastMessage)
      throw new Error(`Can't branch off empty thread`)

    return await _branchThreadFromMessage({ messageId: lastMessage._id, lockerKey: getLockerKey(lastMessage.threadId) })
      .then(() => { sleep(500).then(() => handleSubmit({ input, files })) })
  }

  const streamId = `stream-${Date.now()}_${randomStr(4)}`

  // Optimistically add the messages
  messages.value.push({
    id: `user-${Date.now()}_${randomStr(4)}`,
    role: 'user',
    content: userInput, // TODO: display attachments for user message
    context: { from: getChatNickname() },
  } as any as CustomMessage)
  messages.value.push({
    id: `assistant-${Date.now()}_${randomStr(4)}`,
    role: 'assistant',
    model: chatContext.activeAgent.value.model,
    content: '',
    isStreaming: true,
    streamId,
  } as any as CustomMessage)

  // For some reason creating object reference first does not work, so we push and then get last message
  const targetMessage = messages.value[messages.value.length - 1]!
  chatInput.value = ''

  nextTick(() => { doScrollBottom({ tries: 2 }) })

  // Create new thread
  if (!threadIdRef.value) {
    // Set lockerKey to maintain permission if user is anonymous
    const lockerKey = $auth.loggedIn ? undefined : getRandomLockerKey()
    const newThreadId = await createNewThread(convex, {
      title: userInput,
      lockerKey,
    })
    ignorePathUpdate(() => { threadIdRef.value = newThreadId })

    // Store lockerKey locally
    if (lockerKey)
      setLockerKey(newThreadId, lockerKey)

    // Asynchronously generates a new initial thread title
    generateThreadTitle(convex, { threadId: newThreadId, lockerKey })
  }

  await until(threadIdRef).toBeTruthy({ timeout: 5000, throwOnTimeout: true })

  targetMessage.threadId = threadIdRef.value as Id<'threads'>

  // Wraps in a kontroller to make sure there is only one stream on the same message
  throttle(
    1,
    () => streamToMessage({ message: targetMessage, content: userInput, attachments: files, streamId }),
    { key: `messageStream-${streamId}` },
  )
}

async function resumeStreamToMessage(streamSessionId: string, messageId: string) {
  const message = messagesKeyed.value[messageId]
  if (!message)
    return console.warn('Trying to resume stream for message that does not exist:', messageId)

  if (getInstance(threadIdRef.value))
    return console.warn('Trying to resume stream for message that is currently streaming:', messageId)

  // Currently SSE resume not implemented yet
  // await streamToMessage({ message, resumeStreamId: streamSessionId })

  // Using custom convex polling resume instead
  await pollToMessage({ message, resumeStreamId: streamSessionId })
}

interface PollToMessageArgs {
  message: CustomMessage
  resumeStreamId: string
  threadId?: string
}
async function pollToMessage({ message, resumeStreamId, threadId = threadIdRef.value }: PollToMessageArgs) {
  if (threadId && threadId !== threadIdRef.value) {
    console.warn('User changed thread, poll stopped.')
    return
  }

  streamingMessagesMap[resumeStreamId] = true
  console.log(`Polling: ${message.id}`)

  const messageFromConvex = await convex.query(api.messages.get, {
    messageId: message._id,
    lockerKey: getLockerKey(threadId),
  })
  Object.assign(message, objectPick(messageFromConvex, ['content', 'context', 'isStreaming']))

  if (message.isStreaming) {
    // Wraps in a kontroller to make sure there is only one stream on the same message
    countdown(
      500,
      () => { nextTick(() => { pollToMessage({ message, resumeStreamId, threadId }) }) },
      { key: `messageStream-${resumeStreamId}` },
    )
  }
  else {
    console.log(`Poll completed: ${message.id}`)
    delete streamingMessagesMap[resumeStreamId]
  }

  nextTick(() => { doScrollBottom({ maybe: true }) })
}

interface StreamToMessageArgs {
  message: CustomMessage
  content?: string
  attachments?: File[]
  streamId?: string
  resumeStreamId?: string
}
async function streamToMessage({ message, content, attachments, streamId, resumeStreamId }: StreamToMessageArgs) {
  try {
    streamingMessagesMap[(streamId ?? resumeStreamId)!] = true

    const currentThreadId = threadIdRef.value
    const { response, abortController } = await postChatStream({
      threadId: currentThreadId as Id<'threads'>,
      ...chatContext.activeAgent.value,
      content,
      attachments,
      streamId,
      resumeStreamId,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    message.isStreaming = true

    while (true) {
      if (currentThreadId !== threadIdRef.value) {
        console.warn('User changed thread, stopping stream...')
        abortController.abort()
        break
      }

      const { done, value } = await reader.read()
      if (done)
        break

      const chunk = decoder.decode(value, { stream: true })
      const state: Record<string, any> = {
        content: '',
      }

      if (chunk.startsWith('t: ')) {
        chunk.substring(3).split('t: ').forEach(t => state.content += t)
      }
      else {
        const prefix = chunk.substring(0, 3)
        const part = chunk.substring(3)

        if (!/o: /.test(prefix))
          console.warn('Unknown data:', chunk)

        switch (prefix[0]) {
          case 'o':
            Object.assign(state, JSON.parse(part))
            break
        }

        if (state.messageId)
          message._id = state.messageId

        if (state.sessionId)
          message.streamId = state.sessionId

        if (state.error)
          message.content += `\nError: ${state.error}`
      }

      if (state.content)
        message.content += state.content

      nextTick(() => { doScrollBottom({ maybe: true }) })
    }

    message.isStreaming = false
  }
  catch (error) {
    console.error('Failed to send message:', error)
    message!.content += `\nError: ${(error as Error).message}`
  }
  finally {
    delete streamingMessagesMap[(streamId ?? resumeStreamId)!]
  }

  console.log('Stream completed')
}

async function _branchThreadFromMessage({ messageId, lockerKey }: BranchThreadFromMessageArgs) {
  if (Object.keys(streamingMessagesMap).length > 0)
    throw new Error('Can not branch while streaming')

  const messagesLte = messages.value.slice(0, messages.value.findIndex(m => m._id === messageId) + 1)

  cachedThreadsMessages[threadIdRef.value] = messages.value

  messages.value = messagesLte

  await branchThreadFromMessage(convex, { messageId, lockerKey })
    .then((threadId) => {
      ignorePathUpdate(() => { threadIdRef.value = threadId })
      if (lockerKey)
        setLockerKey(threadId, lockerKey)

      toast({ description: t('chat.toast.threadBranched') })
    })
}

function doScrollBottom({ smooth = true, maybe = false, tries = 0, lastScrollTop = 0 } = {}) {
  if (!lenisRef.value)
    return

  const l = lenisRef.value
  const scrollHeight = l.$el.scrollHeight

  // Allow user to try escape the tries
  if (tries && (l.$el.scrollTop < lastScrollTop))
    tries = 0

  if (!maybe)
    l.lenis.direction = 1
  else if (l.lenis.direction !== 1)
    return

  if (scrollHeight !== l.lenis.limit + l.$el.clientHeight) {
    l.lenis.resize()
    ++tries
  }

  smooth
    ? l.lenis.scrollTo(scrollHeight)
    : l.$el.scrollTop = scrollHeight

  lastScrollTop = l.$el.scrollTop

  if (tries > 1) {
    countdown(250, () => {
      sleep(0).then(() => doScrollBottom({ smooth, maybe, tries: tries - 1, lastScrollTop }))
    }, { key: 'dSB', replace: true })
  }
}
</script>

<template>
  <div class="relative overflow-hidden">
    <VueLenis ref="lenisRef" class="px-4 overflow-y-scroll h-dvh">
      <ChatInterfaceBackground v-bind="{ messages, isFetching }" />
      <div class="mx-auto h-full max-w-full lg:max-w-4xl">
        <div v-if="messages.length" class="relative z-2 space-y-4">
          <div class="pt-6" />

          <ChatMessageCard
            v-for="message of messages" :key="message.id"
            :message
            @branch-off-clicked="_branchThreadFromMessage({
              messageId: message._id,
              lockerKey: getLockerKey(message.threadId),
            })"
          />

          <IUIMaybeGlassCard
            v-if="isThreadFrozen"
            class="text-lg tracking-wide font-medium mx-auto p-2 px-7 border flex gap-1 w-fit items-center"
          >
            <div class="i-hugeicons:snow text-primary" />
            <div>{{ $t('chat.thread.frozenWithDescription') }}</div>
          </IUIMaybeGlassCard>

          <div class="pb-40" />
        </div>
      </div>
    </VueLenis>

    <PrompterArea
      v-bind="{ nearTopBottom, lenisRef, streamingMessagesMap }"
      v-model:chat-input="chatInput"
      @submit="(payload) => handleSubmit(payload)"
    />

    <TopRightQuickSnacks />
  </div>
</template>
