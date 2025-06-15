<script setup lang="ts">
import type { Doc } from 'backend-convex/convex/_generated/dataModel'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { SidebarProvider } from '@/lib/shadcn/components/ui/sidebar'

definePageMeta({
  layout: 'basic',
})

// Load local threads
const { data: threads } = useIDBKeyval<Doc<'threads'>[]>('threads', [])

provideSidebarContext({
  insaneUI: useLocalState('chat/insaneUI', () => false),
  threads,
  interfaceSRK: ref(0),
})
</script>

<template>
  <div class="w-full flex items-center justify-center transition-height">
    <!-- <div v-if="!$auth.loggedIn" class="h-full w-full flex items-center justify-center text-xl">
      {{ $t('pages.chat.loginPrompt') }}
    </div> -->

    <SidebarProvider>
      <ChatSidebar />
      <ChatInterface class="h-full w-full" />
      <ChatFloatingMenu class="absolute left-2 top-2 z-10" />
    </SidebarProvider>
  </div>
</template>
