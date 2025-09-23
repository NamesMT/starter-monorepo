<script setup lang="ts">
import type { AgentsSettings, HostedProvider } from '@local/common/src/chat'
import type { Doc } from 'backend-convex/convex/_generated/dataModel'
import { keyBy } from '@namesmt/utils'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { SidebarProvider } from '@/lib/shadcn/components/ui/sidebar'

// Load all async data
const { data: threads, isFinished: threadsLoaded } = useIDBKeyval<Doc<'threads'>[]>('chat/threads', [])
const { data: pinnedThreadIds, isFinished: pinnedThreadIdsLoaded } = useIDBKeyval<string[]>('chat/pinnedThreadIds', [])
const { data: agentsSettings, isFinished: agentsSettingsLoaded } = useIDBKeyval<AgentsSettings>('chat/agentsSettings', {
  providers: {
  },
  selectedAgent: 'hosted/qwen3-235b-a22b:free',
})

await until(computed(() =>
  threadsLoaded.value && agentsSettingsLoaded.value && pinnedThreadIdsLoaded.value,
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
    'qwen3-235b-a22b:free': {
      enabled: true,
    },
    'deepseek-v3.1': {
      enabled: true,
    },
    'devstral-small-2505': {
      enabled: true,
    },
    'llama-4-scout': {
      enabled: true,
    },
    'gemini-2.0-flash-exp': {
      enabled: false,
      attachments: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain'],
    },
  },
  default: 'deepseek-v3.1',
}))

const activeAgent = computed(() => {
  let [provider, model]: [string, string] = agentsSettings.value.selectedAgent?.split(/\/(.*)/) as any

  if (
    !provider
    || !model
    || (provider !== 'hosted' && !agentsSettings.value.providers[provider]?.models[model])
    || (provider === 'hosted' && !hostedProvider.value.models[model])
  ) {
    [provider, model] = ['hosted', hostedProvider.value.default!]
  }

  return {
    provider,
    model,
    modelSettings: provider === 'hosted'
      ? hostedProvider.value.models[model]
      : agentsSettings.value.providers[provider]?.models[model],
    apiKey: agentsSettings.value.providers[provider]?.apiKey,
  }
})

provideChatContext({
  threads,
  threadsKeyed,
  pinnedThreadIds,
  activeThread,

  hostedProvider,
  agentsSettings,
  activeAgent,

  insaneUI: useLocalState('chat/insaneUI', () => false),
  interfaceSRK: ref(0),
})
</script>

<template>
  <SidebarProvider>
    <ChatGlobalsProvider>
      <ChatHotkeysHook />
      <ChatSidebar class="z-5" />
      <ChatInterface class="h-full w-full" />
      <ChatFloatingMenu class="left-2 top-2 absolute z-10" />
    </ChatGlobalsProvider>
  </SidebarProvider>
</template>
