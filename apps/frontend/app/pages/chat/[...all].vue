<script setup lang="ts">
import type { Doc } from 'backend-convex/convex/_generated/dataModel'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { SidebarProvider } from '@/lib/shadcn/components/ui/sidebar'

definePageMeta({
  layout: 'basic',
  middleware: ['accept-shared-thread'],
})

// Load all async data
const { data: threads, isFinished: threadsLoaded } = useIDBKeyval<Doc<'threads'>[]>('chat/threads', [])
const { data: agentsSetting, isFinished: agentsSettingLoaded } = useIDBKeyval<AgentsSetting>('chat/agentsSetting', {
  providers: {
  },
  selectedAgent: 'hosted/qwen3-32b',
})

await until(computed(() =>
  threadsLoaded.value && agentsSettingLoaded.value,
)).toBeTruthy({ timeout: 60000, throwOnTimeout: true })

// ## Threads
const threadIdRef = useThreadIdRef()
const activeThread = computed<Doc<'threads'> | undefined>(() => {
  if (!threadIdRef.value)
    return undefined

  return threads.value.find(thread => thread._id === threadIdRef.value)
})
useHead({
  title: computed(() => activeThread.value?.title ?? '> New Chat'),
})

// ## Agents
// TODO: load from backend
const hostedProvider: HostedProvider = {
  enabled: true,
  models: {
    'qwen3-32b': {
      enabled: true,
    },
    'deepseek-v3': {
      enabled: true,
    },
  },
  default: 'qwen3-32b',
}

const activeAgent = computed(() => {
  let [provider, model] = agentsSetting.value.selectedAgent?.split('/') as
    [keyof typeof agentsSetting.value.providers | 'hosted', string]

  if (!provider || !model || (provider !== 'hosted' && !agentsSetting.value.providers[provider]))
    [provider, model] = ['hosted', hostedProvider.default!]

  return { provider, model, apiKey: agentsSetting.value.providers[provider]?.apiKey }
})

provideChatContext({
  threads,
  activeThread,

  hostedProvider,
  agentsSetting,
  activeAgent,

  insaneUI: useLocalState('chat/insaneUI', () => false),
  interfaceSRK: ref(0),
})
</script>

<template>
  <div class="w-full flex items-center justify-center transition-height">
    <!-- <div v-if="!$auth.loggedIn" class="h-full w-full flex items-center justify-center text-xl">
      {{ $t('pages.chat.loginPrompt') }}
    </div> -->

    <SidebarProvider>
      <ChatSidebar class="z-5" />
      <ChatInterface class="h-full w-full" />
      <ChatFloatingMenu class="absolute left-2 top-2 z-10" />
    </SidebarProvider>
  </div>
</template>
