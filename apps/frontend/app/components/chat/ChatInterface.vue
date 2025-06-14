<!-- eslint-disable no-console -->
<script setup lang="ts">
import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import type Lenis from 'lenis'
import { keyBy, sleep, uniquePromise } from '@namesmt/utils'
import { api } from 'backend-convex/convex/_generated/api'
import { useConvexClient } from 'convex-vue'
import { countdown, getInstance, throttle } from 'kontroll'
import { VueLenis } from 'lenis/vue'
import { Skeleton } from '@/lib/shadcn/components/ui/skeleton'
import { Card, CardContent } from '~/lib/shadcn/components/ui/card'
import VanishingInput from '~/lib/shadcn/components/ui/vanishing-input/VanishingInput.vue'

const { $auth } = useNuxtApp()
const { convexApiUrl } = useRuntimeConfig().public
const convex = useConvexClient()

// For [...all] routing the value is an array
const threadIdRef = useRouteParams<string>('all', undefined, { transform: { get: s => Array.isArray(s) ? s[0] : s } })

const cachedThreadsMessages: {
  [threadId: string]: Array<CustomMessage>
} = {}

const messages = ref<Array<CustomMessage>>([])
const messagesMapped = computed(() => keyBy(messages.value, 'id'))
const streamingMessages = ref(0)

const chatInput = ref('')

const isFetching = ref(false)

// Lenis have bug with useTemplateRef
const lenisRef = ref<{ $el: HTMLElement, lenis: Lenis }>()

// Fetch messages and resume streams
const { ignoreUpdates: ignorePathUpdate } = watchIgnorable(
  threadIdRef,
  async (threadId, oldThreadId) => {
    if (oldThreadId)
      cachedThreadsMessages[oldThreadId] = messages.value

    messages.value = cachedThreadsMessages[threadId as string] ?? []

    doScrollBottom({ smooth: false })

    if (threadId) {
      isFetching.value = true
      await convex.query(api.messages.list, { threadId: threadId as Doc<'threads'>['_id'], lockerKey: getLockerKey(threadId) })
        .then((existingMessages) => {
          if (threadIdRef.value === threadId) {
            messages.value = existingMessages.map(customMessageTransform)
          }
        })
        .catch((e) => {
          console.error('Failed to fetch messages:', e)
          messages.value = []
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
          uniquePromise(message.streamId, () => resumeStreamProcess(message.streamId!, message.id))
        }
      }

      doScrollBottom({ forceTries: 3 })
    }
  },
  { immediate: true },
)

interface HandleSubmitArgs {
  input: string
  confirmMultiStream?: boolean
}
async function handleSubmit({ input, confirmMultiStream = false }: HandleSubmitArgs) {
  const userInput = input.trim()
  if (!userInput)
    return

  if (!confirmMultiStream && streamingMessages.value > 0)
    return alertIsStreaming(userInput)

  // Optimistically add the messages
  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content: userInput,
  })
  messages.value.push({
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: '',
    isStreaming: true,
    streamId: undefined,
  })

  chatInput.value = ''

  nextTick(() => { doScrollBottom() })

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

  const targetMessage = messages.value[messages.value.length - 1]!
  throttle(
    1,
    async () => await streamToMessage({ message: targetMessage, content: userInput }),
    { key: `messageStream-${targetMessage.id}` },
  )
}

async function resumeStreamProcess(streamSessionId: string, messageId: string) {
  const message = messagesMapped.value[messageId]
  if (!message)
    return console.warn('Trying to resume stream for message that does not exist:', messageId)

  if (getInstance(threadIdRef.value))
    return console.warn('Trying to resume stream for message that is currently streaming:', messageId)

  // Currently we doesn't support SSE resume yet
  // await streamToMessage({ message, resumeStreamId: streamSessionId })

  // Using custom convex polling instead
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

  const messageId = message.id as Id<'messages'>

  const messageFromConvex = await convex.query(api.messages.get, {
    messageId: messageId as Id<'messages'>,
    lockerKey: getLockerKey(threadId),
  })
  Object.assign(message, customMessageTransform(messageFromConvex))

  if (message.isStreaming) {
    sleep(400)
      .then(() => { pollToMessage({ message, resumeStreamId, threadId }) })
  }
  else {
    console.log('Poll completed')
  }

  if (isNearBottom())
    setTimeout(() => { doScrollBottom({ forceTries: 1 }) }, 100)
}

interface StreamToMessageArgs {
  message: CustomMessage
  content?: string
  resumeStreamId?: string
}
async function streamToMessage({ message, content, resumeStreamId }: StreamToMessageArgs) {
  try {
    ++streamingMessages.value

    const currentThreadId = threadIdRef.value
    const abortController = new AbortController()
    const response = await fetch(`${convexApiUrl}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${$auth.token}`,
      },
      body: JSON.stringify({
        threadId: currentThreadId,
        provider: 'openrouter',
        model: 'deepseek/deepseek-chat:free',
        apiKey: 'dummy',
        content,
        resumeStreamId,
        lockerKey: getLockerKey(currentThreadId),
      }),
      signal: abortController.signal,
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
      }

      if (state.sessionId)
        message.streamId = state.sessionId

      if (state.error)
        message.content += `\nError: ${state.error}`

      if (state.content)
        message.content += state.content

      if (isNearBottom())
        setTimeout(() => { doScrollBottom({ forceTries: 1 }) }, 100)
    }

    message.isStreaming = false
  }
  catch (error) {
    console.error('Failed to send message:', error)
    message!.content += `\nError: ${(error as Error).message}`
  }
  finally {
    --streamingMessages.value
  }

  console.log('Stream completed')
}

function doScrollBottom({ smooth = true, maybe = false, forceTries = 0, lastScrollTop = 0 } = {}) {
  if (!lenisRef.value)
    return

  const l = lenisRef.value
  const scrollHeight = l.$el.scrollHeight

  if (l.$el.scrollTop < lastScrollTop)
    forceTries = 0

  if (!forceTries && maybe && !isNearBottom())
    return

  if (scrollHeight !== l.lenis.limit + l.$el.clientHeight)
    l.lenis.resize()

  smooth
    ? l.lenis.scrollTo(scrollHeight)
    : l.$el.scrollTop = scrollHeight

  lastScrollTop = l.$el.scrollTop

  if (forceTries) {
    countdown(200, () => {
      sleep(0).then(() => doScrollBottom({ smooth, maybe, forceTries: forceTries - 1, lastScrollTop }))
    }, { key: 'dSB', replace: true })
  }
}

function isNearBottom() {
  if (!lenisRef.value)
    return

  const l = lenisRef.value
  const scrollHeight = l.$el.scrollHeight

  return (l.$el.scrollTop + l.$el.clientHeight) > (scrollHeight - 69)
}

const multiStreamConfirmDialogOpen = ref(false)
let savedChatInput = ''
function alertIsStreaming(input: string) {
  savedChatInput = input
  multiStreamConfirmDialogOpen.value = true
}
</script>

<template>
  <div class="relative flex flex-col">
    <VueLenis ref="lenisRef" class="h-screen overflow-y-scroll px-4">
      <div class="mx-auto h-full max-w-full lg:max-w-4xl">
        <div
          v-show="!(isFetching && !messages.length)"
          class="pointer-events-none absolute left-0 h-screen w-full place-content-center overflow-hidden"
        >
          <FlickeringGrid
            v-if="false" class="absolute inset-0 z-0 place-content-center" :square-size="4" :grid-gap="6"
            color="#60A5FA" :max-opacity="0.5" :flicker-chance="0.1" :width="2000" :height="2000"
          />

          <div
            v-if="!messages.length"
            class="relative z-2 whitespace-pre-wrap px-2 text-center text-4xl text-gray-400 font-medium tracking-tighter dark:text-gray-500 dark:text-white"
          >
            <p>
              {{ threadIdRef ? $t('chat.interface.sendToStart') : $t('chat.interface.selectOrStart') }}
            </p>
          </div>
        </div>

        <div v-if="messages.length" class="z-2 space-y-4">
          <div class="pt-6" />

          <div
            v-for="m of messages" :key="m.id" class="flex"
            :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <Card
              class="bg-transparent shadow-md"
              :class="[
                m.role === 'user' ? 'border-secondary-200' : 'border-primary-200',
                m.role === 'user' ? 'max-w-80% md:max-w-2xl' : 'max-w-full md:max-w-3xl',
              ]"
            >
              <!-- <CardHeader class="px-4 py-2">
                <CardTitle class="text-sm font-semibold">
                  {{ m.role === 'user' ? $t('pages.chat.userLabel') : $t('pages.chat.aiLabel') }}
                </CardTitle>
              </CardHeader> -->
              <CardContent class="px-4 py-3">
                <div v-if="m.isStreaming && !m.content" class="flex gap-2">
                  <div>{{ $t('generating') }}</div>
                  <div class="spinner h-5 w-5" />
                </div>
                <MDC v-else :value="m.content" />
                <div class="hidden first:block">
                  <Skeleton
                    class="h-5 w-$c-W rounded-full bg-muted-foreground" :style="{
                      '--c-W': `${(Math.floor(Math.random() * (300 - 100 + 1)) + 100) * (m.role === 'user' ? 1 : 2)}px`,
                    }"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div class="pb-40" />
        </div>
      </div>
    </VueLenis>

    <LiquidGlassDiv class="bottom-0 left-0 max-w-full w-full border-t border-secondary p-4 $c-radius=0px absolute!">
      <div>
        <div class="mx-auto max-w-lg flex flex-col gap-3">
          <VanishingInput
            v-model="chatInput" :placeholders="useInputThoughtsPlaceholders().value"
            @submit="(input) => handleSubmit({ input })"
          />
        </div>
      </div>
    </LiquidGlassDiv>

    <!-- Multi Stream Confirm Dialog -->
    <AlertDialog v-model:open="multiStreamConfirmDialogOpen" @update:open="(o) => { if (!o) chatInput = savedChatInput }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('chat.multiStreamConfirmDialog.title') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('chat.multiStreamConfirmDialog.description') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ $t('cancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="handleSubmit({ input: savedChatInput, confirmMultiStream: true })">
            {{ $t('continue') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
