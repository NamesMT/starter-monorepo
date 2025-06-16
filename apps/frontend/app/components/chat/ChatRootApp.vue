<script setup lang="ts">
import type { Doc } from 'backend-convex/convex/_generated/dataModel'
import { keyBy } from '@namesmt/utils'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { SidebarProvider } from '@/lib/shadcn/components/ui/sidebar'

// Load all async data
const { data: threads, isFinished: threadsLoaded } = useIDBKeyval<Doc<'threads'>[]>('chat/threads', [])
const { data: pinnedThreadIds, isFinished: pinnedThreadIdsLoaded } = useIDBKeyval<string[]>('chat/pinnedThreadIds', [])
const { data: agentsSetting, isFinished: agentsSettingLoaded } = useIDBKeyval<AgentsSetting>('chat/agentsSetting', {
  providers: {
  },
  selectedAgent: 'hosted/qwen3-32b',
})

await until(computed(() =>
  threadsLoaded.value && agentsSettingLoaded.value && pinnedThreadIdsLoaded.value,
)).toBeTruthy({ timeout: 60000, throwOnTimeout: true })

// ## Threads
const threadIdRef = useThreadIdRef()
const threadsKeyed = computed(() => keyBy(threads.value, '_id'))
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
const hostedProvider = computed<HostedProvider>(() => ({
  enabled: true,
  models: {
    'qwen3-32b': {
      enabled: true,
    },
    'deepseek-v3': {
      enabled: true,
    },
    'devstral-small-2505': {
      enabled: true,
    },
    'llama-4-scout': {
      enabled: true,
    },
  },
  default: 'qwen3-32b',
}))

const activeAgent = computed(() => {
  let [provider, model] = agentsSetting.value.selectedAgent?.split(/\/(.*)/) as
    [keyof typeof agentsSetting.value.providers | 'hosted', string]

  if (!provider || !model || (provider !== 'hosted' && !agentsSetting.value.providers[provider]))
    [provider, model] = ['hosted', hostedProvider.value.default!]

  return { provider, model, apiKey: agentsSetting.value.providers[provider]?.apiKey }
})

provideChatContext({
  threads,
  threadsKeyed,
  pinnedThreadIds,
  activeThread,

  hostedProvider,
  agentsSetting,
  activeAgent,

  insaneUI: useLocalState('chat/insaneUI', () => false),
  interfaceSRK: ref(0),
})
</script>

<template>
  <SidebarProvider>
    <ChatSidebar class="z-5" />
    <ChatInterface class="h-full w-full" />
    <ChatFloatingMenu class="absolute left-2 top-2 z-10" />
  </SidebarProvider>
</template>
