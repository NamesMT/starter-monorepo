<!-- eslint-disable no-console -->
<script setup lang="ts">
import type { ChatAttachment, ChatStreamMetadata } from '@local/common/src/chat'
import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import type Lenis from 'lenis'
import { keyBy, objectPick, randomStr, sleep, uniquePromise } from '@namesmt/utils'
import { parseJsonEventStream, uiMessageChunkSchema } from 'ai'
import { api } from 'backend-convex/convex/_generated/api'
import { useConvexClient } from 'convex-vue'
import { countdown, debounce, getInstance, throttle } from 'kontroll'
import { VueLenis } from 'lenis/vue'
import { useToast } from '~/lib/shadcn/components/ui/toast'

const { $auth } = useNuxtApp()
const convex = useConvexClient()
const chatContext = useChatContext()
const { toast } = useToast()
const { ts } = useI18n()

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
    handleSubmit({ input: v })
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

const attachments = useChatAttachments()
/** Guards against a second submit while a previous one is still uploading/sending. */
const isSubmitting = ref(false)

/**
 * Merges server messages into the local list by `_id`.
 *
 * This keeps object identity (so a streaming write resolves to the same message the
 * render layer holds), adds messages created by other users/tabs, and never clobbers
 * the content of a message that is currently streaming locally.
 */
function mergeServerMessages(serverMessages: Doc<'messages'>[]) {
  const byId = new Map<string, CustomMessage>()
  for (const message of messages.value) {
    if (message._id)
      byId.set(message._id, message)
  }

  for (const serverMessage of serverMessages) {
    const existing = byId.get(serverMessage._id)

    if (existing) {
      if (existing.streamId && streamingMessagesMap[existing.streamId])
        continue

      // Local object URLs on optimistic attachments are superseded by the server's
      // resolved URLs, so release them once we overwrite the message.
      for (const attachment of existing.attachments ?? []) {
        if (attachment.url?.startsWith('blob:'))
          URL.revokeObjectURL(attachment.url)
      }

      Object.assign(existing, customMessageTransform(serverMessage))
      continue
    }

    const transformed = customMessageTransform(serverMessage)
    messages.value.push(transformed)
    byId.set(serverMessage._id, transformed)
  }
}

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
              mergeServerMessages(messagesFromConvex)
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
            toast({ variant: 'destructive', description: ts('chat.toast.threadRemovedExternal') })

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
}
async function handleSubmit({ input }: HandleSubmitArgs) {
  const userInput = input.trim()
  const hasAttachments = attachments.hasAttachments.value
  if (!userInput && !hasAttachments)
    return

  if (isSubmitting.value)
    return

  if (isThreadFrozen.value) {
    const lastMessage = messages.value.at(-1)
    if (!lastMessage)
      throw new Error(`Can't branch off empty thread`)

    return await _branchThreadFromMessage({ messageId: lastMessage._id, lockerKey: getLockerKey(lastMessage.threadId) })
      .then(() => { sleep(500).then(() => handleSubmit({ input })) })
  }

  isSubmitting.value = true

  try {
    // Create new thread
    if (!threadIdRef.value) {
      // Set lockerKey to maintain permission if user is anonymous
      const lockerKey = $auth.loggedIn ? undefined : getRandomLockerKey()
      const newThreadId = await createNewThread(convex, {
        title: userInput || attachments.items.value[0]?.name || 'New chat',
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

    const currentThreadId = threadIdRef.value as Id<'threads'>

    // Upload staged attachments first, so the composer can show real progress and the
    // chat request only carries lightweight storage references.
    let uploadedAttachments: ChatAttachment[] = []
    if (hasAttachments) {
      try {
        uploadedAttachments = await attachments.uploadAll({
          convex,
          threadId: currentThreadId,
          lockerKey: getLockerKey(currentThreadId),
        })
      }
      catch (error) {
        toast({ variant: 'destructive', description: ts('chat.toast.attachmentsUploadFailed') })
        console.error('Failed to upload attachments:', error)
        return
      }
    }

    // Hand the staged items to the optimistic message. `takeAll` deliberately keeps the
    // local preview object URLs alive (they are revoked later, once the server-provided
    // URLs replace them) instead of revoking them here.
    const optimisticAttachments = attachments.takeAll().map(item => ({
      storageId: item.storageId!,
      name: item.name,
      type: item.type,
      size: item.size,
      url: item.previewUrl ?? null,
    }))

    const streamId = `stream-${Date.now()}_${randomStr(4)}`

    // Optimistically add the messages
    const userMessage = {
      id: `user-${Date.now()}_${randomStr(4)}`,
      role: 'user',
      content: userInput,
      context: { from: getChatNickname() },
      attachments: optimisticAttachments,
    } as any as CustomMessage
    const targetMessage = {
      id: `assistant-${Date.now()}_${randomStr(4)}`,
      role: 'assistant',
      model: chatContext.activeAgent.value.model,
      content: '',
      isStreaming: true,
      streamId,
    } as any as CustomMessage

    messages.value.push(userMessage)
    messages.value.push(targetMessage)

    chatInput.value = ''

    nextTick(() => { doScrollBottom({ tries: 2 }) })

    targetMessage.threadId = currentThreadId

    // Wraps in a kontroller to make sure there is only one stream on the same message
    throttle(
      1,
      () => streamToMessage({
        message: targetMessage,
        userMessage,
        content: userInput,
        attachments: uploadedAttachments,
        streamId,
      }),
      { key: `messageStream-${streamId}` },
    )
  }
  finally {
    isSubmitting.value = false
  }
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
  Object.assign(message, objectPick(messageFromConvex, ['content', 'context', 'isStreaming', 'toolInvocations']))

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
  /** The optimistic user message, reconciled with its server id from stream metadata. */
  userMessage?: CustomMessage
  content?: string
  attachments?: ChatAttachment[]
  streamId?: string
  resumeStreamId?: string
}

/**
 * Resolves the live object for a message we may have created optimistically.
 *
 * The message list is periodically reconciled with the server, which can replace the
 * array (and therefore the object) while a stream is in flight. Writing through this
 * resolver keeps streamed text attached to whatever instance is currently rendered.
 */
function resolveStreamingMessage(message: CustomMessage) {
  if (message._id) {
    const byId = messages.value.find(m => m._id === message._id)
    if (byId)
      return byId
  }
  if (message.streamId) {
    const byStream = messages.value.find(m => m.streamId === message.streamId)
    if (byStream)
      return byStream
  }
  return message
}

interface ToolInvocationPatch {
  id: string
  name?: string
  input?: unknown
  output?: unknown
  error?: string
  state: 'call' | 'result' | 'error'
}

/** Inserts or updates a tool invocation on a message, keyed by the tool call id. */
function upsertToolInvocation(target: CustomMessage, patch: ToolInvocationPatch) {
  const invocations = (target.toolInvocations ??= [])
  const existing = invocations.find(invocation => invocation.id === patch.id)

  if (existing) {
    Object.assign(existing, patch, { name: patch.name ?? existing.name })
    return
  }

  invocations.push({
    id: patch.id,
    name: patch.name ?? 'tool',
    input: patch.input,
    output: patch.output,
    error: patch.error,
    state: patch.state,
  })
}

async function streamToMessage({ message, userMessage, content, attachments, streamId, resumeStreamId }: StreamToMessageArgs) {
  const streamKey = (streamId ?? resumeStreamId)!

  try {
    streamingMessagesMap[streamKey] = true

    const currentThreadId = threadIdRef.value
    const { response, abortController } = await postChatStream({
      threadId: currentThreadId as Id<'threads'>,
      ...chatContext.activeAgent.value,
      attachmentAccept: chatContext.activeAgent.value.modelSettings?.attachments,
      personalContext: chatContext.agentsSettings.value.personalContext,
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

    message.isStreaming = true

    // Accumulate locally so switching the resolved target (e.g. after a server
    // reconciliation) never loses already-streamed text.
    let streamedText = ''

    // `parseJsonEventStream` handles SSE framing/decoding for us, so we no longer need
    // to assume anything about chunk boundaries.
    const parsedStream = parseJsonEventStream({ stream: response.body, schema: uiMessageChunkSchema })

    for await (const event of parsedStream) {
      if (currentThreadId !== threadIdRef.value) {
        console.warn('User changed thread, stopping stream...')
        abortController.abort()
        break
      }

      if (!event.success) {
        console.warn('Failed to parse chat stream event:', event.error)
        continue
      }

      const chunk = event.value

      switch (chunk.type) {
        case 'start':
        case 'message-metadata': {
          const metadata = chunk.messageMetadata as ChatStreamMetadata | undefined
          if (metadata?.messageId)
            message._id = metadata.messageId as Id<'messages'>
          if (metadata?.streamId)
            message.streamId = metadata.streamId
          if (metadata?.userMessageId && userMessage)
            userMessage._id = metadata.userMessageId as Id<'messages'>
          break
        }
        case 'text-delta':
          streamedText += chunk.delta
          break
        case 'tool-input-start':
          upsertToolInvocation(resolveStreamingMessage(message), {
            id: chunk.toolCallId,
            name: chunk.toolName,
            state: 'call',
          })
          break
        case 'tool-input-available':
          upsertToolInvocation(resolveStreamingMessage(message), {
            id: chunk.toolCallId,
            name: chunk.toolName,
            input: chunk.input,
            state: 'call',
          })
          break
        case 'tool-output-available':
          upsertToolInvocation(resolveStreamingMessage(message), {
            id: chunk.toolCallId,
            output: chunk.output,
            state: 'result',
          })
          break
        case 'tool-output-error':
          upsertToolInvocation(resolveStreamingMessage(message), {
            id: chunk.toolCallId,
            error: chunk.errorText,
            state: 'error',
          })
          break
        case 'error':
          streamedText += `\n\nError: ${chunk.errorText}`
          break
      }

      resolveStreamingMessage(message).content = streamedText
      nextTick(() => { doScrollBottom({ maybe: true }) })
    }

    const target = resolveStreamingMessage(message)
    target.content = streamedText
    target.isStreaming = false
  }
  catch (error) {
    console.error('Failed to send message:', error)
    const target = resolveStreamingMessage(message)
    target.content += `\nError: ${(error as Error).message}`
    target.isStreaming = false
  }
  finally {
    delete streamingMessagesMap[streamKey]
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

      toast({ description: ts('chat.toast.threadBranched') })
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
      v-bind="{ nearTopBottom, lenisRef, streamingMessagesMap, attachments }"
      v-model:chat-input="chatInput"
      @submit="(payload) => handleSubmit(payload)"
    />

    <TopRightQuickSnacks />
  </div>
</template>
