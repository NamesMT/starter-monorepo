<!-- eslint-disable no-console -->
<script setup lang="ts">
import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import type Lenis from 'lenis'
import { keyBy, sleep, uniquePromise } from '@namesmt/utils'
import { api } from 'backend-convex/convex/_generated/api'
import { useConvexClient } from 'convex-vue'
import { countdown, debounce, getInstance, throttle } from 'kontroll'
import { VueLenis } from 'lenis/vue'
import { Split } from 'lucide-vue-next'
import { Skeleton } from '@/lib/shadcn/components/ui/skeleton'
import { Card, CardContent } from '~/lib/shadcn/components/ui/card'
import { useToast } from '~/lib/shadcn/components/ui/toast'
import VanishingInput from '~/lib/shadcn/components/ui/vanishing-input/VanishingInput.vue'
import LiquidGlassDiv from '../LiquidGlassDiv.vue'

const isDev = import.meta.dev
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
  if (!el)
    return [null, null]

  const currentScroll = Math.ceil(lenisRef.value!.lenis.targetScroll || scrollY.value)

  const gapFromTop = currentScroll
  const gapFromBottom = el.scrollHeight - el.clientHeight - currentScroll

  const nearTop = gapFromTop < 369
  const nearBottom = gapFromBottom < 369
  return [nearTop && gapFromTop + 1, nearBottom && gapFromBottom + 1, lenisRef.value!.lenis.targetScroll, scrollY.value]
})

const threadIdRef = useThreadIdRef()
const isThreadFrozen = computed(() => chatContext.activeThread.value?.frozen)
const fetchKey = ref(0)

const cachedThreadsMessages: {
  [threadId: string]: Array<CustomMessage>
} = {}
const messages = ref<Array<CustomMessage>>([])
const messagesKeyed = computed(() => keyBy(messages.value, 'id'))
const streamingMessages = ref(0)
const isFetching = ref(false)
const chatInput = ref('')

// Fetch messages as needed and resume streams
const { ignoreUpdates: ignorePathUpdate } = watchIgnorable(
  [threadIdRef, fetchKey],
  async ([threadId], [oldThreadId]) => {
    if (oldThreadId)
      cachedThreadsMessages[oldThreadId] = messages.value

    messages.value = cachedThreadsMessages[threadId as string] ?? []

    doScrollBottom({ smooth: false })

    if (threadId) {
      isFetching.value = true
      await convex.query(api.messages.listByThread, { threadId: threadId as Doc<'threads'>['_id'], lockerKey: getLockerKey(threadId) })
        .then((existingMessages) => {
          if (threadIdRef.value === threadId) {
            messages.value = existingMessages.map(customMessageTransform)
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
          uniquePromise(message.streamId, () => resumeStreamProcess(message.streamId!, message.id))
        }
      }

      nextTick(() => doScrollBottom({ tries: 6 }))
    }
  },
  { immediate: true },
)

// Subscribe to a counter to check for messages from other concurrent sessions
watchImmediate(threadIdRef, (threadId) => {
  if (!threadId)
    return

  console.log(`Subscribing to messages count of: ${threadId}`)
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
    console.log(`Unsubscribed from ${threadId}`)
  })
})

interface HandleSubmitArgs {
  input: string
  confirmMultiStream?: boolean
}
async function handleSubmit({ input, confirmMultiStream = false }: HandleSubmitArgs) {
  const userInput = input.trim()
  if (!userInput)
    return

  if (isThreadFrozen.value) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (!lastMessage)
      throw new Error(`Can't branch off empty thread`)

    return await _branchThreadFromMessage({ messageId: lastMessage._id, lockerKey: getLockerKey(lastMessage.threadId) })
      .then(() => { sleep(500).then(() => handleSubmit({ input })) })
  }

  if (!confirmMultiStream && streamingMessages.value > 0)
    return alertIsStreaming(userInput)

  // Optimistically add the messages
  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content: userInput,
    context: { from: getUserName() },
  } as any as CustomMessage)
  messages.value.push({
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: '',
    isStreaming: true,
    streamId: undefined,
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

  throttle(
    1,
    async () => await streamToMessage({ message: targetMessage, content: userInput }),
    { key: `messageStream-${targetMessage.id}` },
  )
}

async function resumeStreamProcess(streamSessionId: string, messageId: string) {
  const message = messagesKeyed.value[messageId]
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

  const messageFromConvex = await convex.query(api.messages.get, {
    messageId: message._id,
    lockerKey: getLockerKey(threadId),
  })
  Object.assign(message, customMessageTransform(messageFromConvex))

  if (message.isStreaming) {
    sleep(500)
      .then(() => { pollToMessage({ message, resumeStreamId, threadId }) })
  }
  else {
    console.log('Poll completed')
  }

  nextTick(() => { doScrollBottom({ maybe: true }) })
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
    const { response, abortController } = await postChatStream({
      threadId: currentThreadId as Id<'threads'>,
      provider: 'openrouter',
      model: 'deepseek/deepseek-chat:free',
      apiKey: 'dummy',
      content,
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
    --streamingMessages.value
  }

  console.log('Stream completed')
}

async function _branchThreadFromMessage({ messageId, lockerKey }: BranchThreadFromMessageArgs) {
  if (streamingMessages.value > 0)
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
        <FlickeringGrid
          v-if="chatContext.insaneUI.value" class="absolute inset-0 z-0 place-content-center"
          :square-size="10" :grid-gap="5" color="#60A5FA" :max-opacity="0.5" :flicker-chance="0.1"
        />

        <div
          v-show="!messages.length && !isFetching"
          class="absolute left-0 z-0 h-screen w-full place-content-center overflow-hidden transition-height"
        >
          <IUIMaybeGlassCard
            v-if="!messages.length"
            :key="chatContext.interfaceSRK.value"
            v-motion-pop-visible-once
            class="relative z-2 mx-auto w-fit whitespace-pre-wrap p-4 text-center text-4xl font-medium tracking-tighter"
          >
            <p>
              {{ threadIdRef ? $t('chat.interface.sendToStart') : $t('chat.interface.selectOrStart') }}
            </p>
          </IUIMaybeGlassCard>
        </div>

        <div v-if="messages.length" class="relative z-2 space-y-4">
          <div class="pt-6" />

          <div
            v-for="m of messages" :key="m.id" class="group/message relative flex"
            :class="m.role === 'user' ? 'justify-end' : 'justify-start pb-10'"
          >
            <component
              :is="chatContext.insaneUI.value ? LiquidGlassDiv : 'div'"
              class="border rounded-$radius $c-radius=$radius"
              :class="[
                m.role === 'user'
                  ? 'bg-secondary-100 dark:bg-secondary-950 border-secondary-200 max-w-80% md:max-w-2xl'
                  : 'bg-primary-100 dark:bg-primary-950 border-primary-200 max-w-full md:max-w-3xl',
                chatContext.insaneUI.value
                  ? 'bg-opacity-50!'
                  : 'bg-opacity-5!',
              ]" tabindex="0"
            >
              <Card
                class="bg-transparent shadow-md"
              >
                <!-- <CardHeader class="px-4 py-2">
                  <CardTitle class="text-sm font-semibold">
                    {{ m.role === 'user' ? $t('pages.chat.userLabel') : $t('pages.chat.aiLabel') }}
                  </CardTitle>
                </CardHeader> -->
                <CardContent class="px-4 py-3 [&_.prose-hr]:(border-accent-foreground!)">
                  <div v-if="m.isStreaming && !m.content" class="flex gap-2">
                    <div>{{ $t('generating') }}</div>
                    <div class="spinner h-5 w-5" />
                  </div>
                  <MDC v-else :value="m.content" class="only-child:[&>.prose-p]:my-0" />
                  <div class="hidden first:block">
                    <Skeleton
                      class="h-5 w-$c-W rounded-full bg-muted-foreground" :style="{
                        '--c-W': `${(Math.floor(Math.random() * (300 - 100 + 1)) + 100) * (m.role === 'user' ? 1 : 2)}px`,
                      }"
                    />
                  </div>
                </CardContent>
              </Card>
            </component>

            <div
              v-if="m.role === 'user'"
              class="absolute right-2 top-100% flex gap-1 opacity-0 transition-opacity group-hover/message:opacity-100"
            >
              <div v-if="m.context?.from" class="text-xs">
                {{ m.context.from }}
              </div>
            </div>

            <div
              v-if="m.role !== 'user'"
              class="absolute bottom-2 left-2 flex gap-1 opacity-0 transition-opacity group-hover/message:opacity-100"
            >
              <Tooltip :delay-duration="500">
                <TooltipTrigger as-child>
                  <CodeCopy :code="m.content" class="hover:text-accent-foreground hover:bg-accent!" />
                </TooltipTrigger>
                <TooltipContent side="bottom" :side-offset="6">
                  <p>{{ $t('chat.message.copy') }}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip v-show="m.isStreaming === false" :delay-duration="500">
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost" size="icon" class="size-7" @click="_branchThreadFromMessage({
                      messageId: m._id,
                      lockerKey: getLockerKey(m.threadId),
                    })"
                  >
                    <Split />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" :side-offset="6">
                  <p>{{ $t('chat.message.branch') }}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <IUIMaybeGlassCard
            v-if="isThreadFrozen"
            class="mx-auto w-fit flex items-center gap-1 border p-2 px-7 text-lg font-medium tracking-wide"
          >
            <div class="i-hugeicons:snow text-primary" />
            <div>{{ $t('chat.thread.frozenWithDescription') }}</div>
          </IUIMaybeGlassCard>

          <div class="pb-40" />
        </div>
      </div>
    </VueLenis>

    <LiquidGlassDiv class="bottom-0 left-0 z-3 max-w-full w-full border-t border-secondary p-4 $c-radius=0px absolute!">
      <div v-if="isDev" class="absolute bottom-100%">
        {{ nearTopBottom }}
      </div>
      <div class="absolute bottom-100% right-6 mb-2 flex flex-col gap-2">
        <Button
          variant="outline" size="icon" class="rounded-xl p-1 opacity-100 transition-opacity duration-500"
          :class="nearTopBottom[0] && 'invisible opacity-0'" @click="lenisRef!.lenis.scrollTo('top')"
        >
          <div class="i-hugeicons:circle-arrow-up-03 h-full w-full" />
        </Button>
        <Button
          variant="outline" size="icon" class="rounded-xl p-1 opacity-100 transition-opacity duration-500"
          :class="nearTopBottom[1] && 'invisible opacity-0'" @click="lenisRef!.lenis.scrollTo('bottom')"
        >
          <div class="i-hugeicons:circle-arrow-down-03 h-full w-full" />
        </Button>
      </div>
      <div>
        <div class="mx-auto max-w-lg flex flex-col gap-3">
          <VanishingInput
            v-model="chatInput" :placeholders="useInputThoughtsPlaceholders().value"
            @submit="(input) => handleSubmit({ input })"
          />
        </div>
      </div>
    </LiquidGlassDiv>

    <!--  -->
    <div class="absolute right-3 top-3 hidden items-center lg:flex">
      <Tooltip :delay-duration="500">
        <TooltipTrigger as-child>
          <Button
            variant="ghost" size="icon"
            class="size-7"
            @click="chatContext.insaneUI.value = !chatContext.insaneUI.value"
          >
            <div :class="chatContext.insaneUI.value ? ' i-hugeicons:crazy bg-mainGradient' : ' i-hugeicons:confused'" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" :side-offset="6">
          <p>InsaneUI</p>
        </TooltipContent>
      </Tooltip>
    </div>

    <!-- Multi Stream Confirm Dialog -->
    <AlertDialog
      v-model:open="multiStreamConfirmDialogOpen"
      @update:open="(o) => { if (!o) chatInput = savedChatInput }"
    >
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
