<!-- eslint-disable no-console -->
<script setup lang="ts">
import type { ChatAttachment, ChatPart, ChatStreamMetadata } from '@local/common/src/chat'
import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import type Lenis from 'lenis'
import { appendReasoningPart, appendTextPart, getMessageText, upsertToolPart } from '@local/common/src/chat'
import { objectPick, randomStr, sleep, uniquePromise } from '@namesmt/utils'
import { parseJsonEventStream, uiMessageChunkSchema } from 'ai'
import { api } from 'backend-convex/convex/_generated/api'
import { useConvexClient } from 'convex-vue'
import { countdown, debounce, getInstance, throttle } from 'kontroll'
import { VueLenis } from 'lenis/vue'
import { toast } from 'vue-sonner'

const { $auth } = useNuxtApp()
const convex = useConvexClient()
const chatContext = useChatContext()
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
const streamingMessagesMap = reactive<Record<string, true>>({ })

/**
 * Finds a message by either identifier.
 *
 * `id` starts as a local placeholder and `_id` only arrives with the stream metadata, so a
 * caller holding one of them (a handler gets `_id`, a list key uses `id`) must not miss the
 * message it means. Keying a map on a single field silently returned `undefined` for every
 * message created in the current session.
 */
function findMessageById(id: string): CustomMessage | undefined {
  return messages.value.find(message => message.id === id || message._id === id)
}
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
            toast.error(ts('chat.toast.threadRemovedExternal'))

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
let unsubscribeMessagesCount: (() => void) | undefined
watchImmediate(threadIdRef, (threadId) => {
  // Drop the previous subscription before switching thread, and on scope teardown below,
  // otherwise the last one outlives the component.
  unsubscribeMessagesCount?.()
  unsubscribeMessagesCount = undefined

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
  unsubscribeMessagesCount = () => {
    unsubscribe()
    console.log(`Unsubscribed from: ${threadId}`)
  }
})
onScopeDispose(() => {
  unsubscribeMessagesCount?.()
  unsubscribeMessagesCount = undefined
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
        toast.error(ts('chat.toast.attachmentsUploadFailed'))
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
      parts: [{ type: 'text', text: userInput }],
      context: { from: getChatNickname() },
      attachments: optimisticAttachments,
    } as any as CustomMessage
    const targetMessage = {
      id: `assistant-${Date.now()}_${randomStr(4)}`,
      role: 'assistant',
      model: chatContext.activeAgent.value.model,
      parts: [],
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
  const message = findMessageById(messageId)
  if (!message)
    return console.warn('Trying to resume stream for message that does not exist:', messageId)

  // Keyed to match the polling loop registered by `pollToMessage`, so this actually detects it.
  if (getInstance(`messageStream-${streamSessionId}`))
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
  Object.assign(message, objectPick(messageFromConvex, ['parts', 'context', 'isStreaming']))

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
  /** Assistant message to regenerate in place instead of adding a new turn. */
  regenerateMessageId?: string
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

/**
 * Stop handle per live stream, so the composer's stop button can reach the one it belongs to.
 */
const activeStreams = reactive<Record<string, { message: CustomMessage, abort: () => Promise<void> }>>({})

/** True while the thread's assistant reply is still streaming. */
const isStreaming = computed(() => Object.keys(streamingMessagesMap).length > 0)

async function stopStreaming() {
  const handles = Object.values(activeStreams)
  if (!handles.length)
    return

  await Promise.all(handles.map(handle => handle.abort()))
}

async function streamToMessage({ message, userMessage, content, attachments, streamId, resumeStreamId, regenerateMessageId }: StreamToMessageArgs) {
  const streamKey = (streamId ?? resumeStreamId ?? regenerateMessageId)!
  /** Pending throttled render timer, cleared once the stream settles. */
  let flushTimer: ReturnType<typeof setTimeout> | undefined

  // Declared outside the try so the catch/finally paths can still settle the parts.
  let parts: ChatPart[] = []

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
      regenerateMessageId,
    })

    // Expose a stop handle for this stream while it runs.
    activeStreams[streamKey] = {
      message,
      abort: async () => {
        // Cooperative: ask the server to stop, which the generating action polls. The
        // response stream is left open so the partial text still arrives and is saved.
        const target = resolveStreamingMessage(message)
        if (target._id) {
          await convex.mutation(api.messages.requestStop, {
            messageId: target._id as Id<'messages'>,
            lockerKey: getLockerKey(currentThreadId),
          }).catch((error) => {
            console.warn('Stop request failed:', error)
            // Fall back to dropping the connection so the UI is not stuck streaming.
            abortController.abort()
          })
        }
        else {
          abortController.abort()
        }
      },
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    message.isStreaming = true

    // Accumulate locally so switching the resolved target (e.g. after a server
    // reconciliation) never loses already-streamed text. Parts are built with the same
    // helpers the server uses, so the optimistic view matches what gets persisted.
    parts = []

    // Re-parsing the whole markdown (including shiki-highlighted code) on every token is
    // what made long streams janky. Flush the accumulated text on a throttle instead and
    // let the interval grow with the message so the per-flush render cost stays bounded.
    let lastFlushAt = 0

    function flushStreamedText() {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = undefined
      }

      lastFlushAt = Date.now()
      // A fresh array each flush: `parts` is mutated in place as tokens arrive, and Vue only
      // tracks the assignment, so handing it the same array again would render nothing.
      resolveStreamingMessage(message).parts = [...parts]
      nextTick(() => { doScrollBottom({ maybe: true }) })
    }

    function scheduleStreamFlush() {
      const interval = Math.min(250, 60 + Math.floor(getMessageText(parts).length / 120))
      const elapsed = Date.now() - lastFlushAt

      if (elapsed >= interval) {
        flushStreamedText()
        return
      }

      if (!flushTimer)
        flushTimer = setTimeout(flushStreamedText, interval - elapsed)
    }

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
          appendTextPart(parts, chunk.delta)
          break
        case 'reasoning-delta':
          appendReasoningPart(parts, chunk.delta)
          break
        case 'start-step':
          parts.push({ type: 'step-start' })
          break
        case 'tool-input-available':
          upsertToolPart(parts, {
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            input: chunk.input,
            state: 'input-available',
          })
          break
        case 'tool-output-available':
          // `toolName` is not on output chunks; the part already exists from the input chunk.
          upsertToolPart(parts, {
            toolCallId: chunk.toolCallId,
            output: chunk.output,
            state: 'output-available',
          })
          break
        case 'tool-output-error':
          upsertToolPart(parts, {
            toolCallId: chunk.toolCallId,
            errorText: chunk.errorText,
            state: 'output-error',
          })
          break
        case 'error':
          appendTextPart(parts, `\n\nError: ${chunk.errorText}`)
          break
      }

      scheduleStreamFlush()
    }

    // Final, unthrottled render with the complete text.
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = undefined
    }

    const target = resolveStreamingMessage(message)
    target.parts = [...parts]
    target.isStreaming = false
  }
  catch (error) {
    console.error('Failed to send message:', error)

    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = undefined
    }

    const target = resolveStreamingMessage(message)
    appendTextPart(parts, `\nError: ${(error as Error).message}`)
    target.parts = [...parts]
    target.isStreaming = false
  }
  finally {
    delete streamingMessagesMap[streamKey]
    delete activeStreams[streamKey]
  }

  console.log('Stream completed')
}

async function _branchThreadFromMessage({ messageId, lockerKey }: BranchThreadFromMessageArgs) {
  if (Object.keys(streamingMessagesMap).length > 0)
    return toast(ts('chat.toast.busyStreaming'))

  const messagesLte = messages.value.slice(0, messages.value.findIndex(m => m._id === messageId) + 1)

  cachedThreadsMessages[threadIdRef.value] = messages.value

  messages.value = messagesLte

  await branchThreadFromMessage(convex, { messageId, lockerKey })
    .then((threadId) => {
      ignorePathUpdate(() => { threadIdRef.value = threadId })
      if (lockerKey)
        setLockerKey(threadId, lockerKey)

      toast(ts('chat.toast.threadBranched'))
    })
}

async function _regenerateMessage({ messageId }: { messageId: string }) {
  if (Object.keys(streamingMessagesMap).length > 0)
    return toast(ts('chat.toast.busyStreaming'))

  const message = findMessageById(messageId)
  if (!message)
    return

  // The reply stays in the list and is cleared in place: removing it would orphan the object
  // the stream writes into (the stream resolves its target by id through `messages`), so the
  // regenerated text would never render.
  Object.assign(message, { parts: [], isStreaming: true, streamId: undefined })

  await streamToMessage({
    message,
    regenerateMessageId: messageId,
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
            @regenerate-clicked="_regenerateMessage({ messageId: message._id })"
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
      v-bind="{ nearTopBottom, lenisRef, streamingMessagesMap, isStreaming, attachments }"
      v-model:chat-input="chatInput"
      @submit="(payload) => handleSubmit(payload)"
      @stop="stopStreaming"
    />

    <TopRightQuickSnacks />
  </div>
</template>
