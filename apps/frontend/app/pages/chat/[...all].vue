<script setup lang="ts">
import { SidebarProvider } from '@/lib/shadcn/components/ui/sidebar'

definePageMeta({
  layout: 'basic',
})

const { $auth } = useNuxtApp()
</script>

<template>
  <div class="w-full flex items-center justify-center">
    <div v-if="!$auth.loggedIn" class="h-full w-full flex items-center justify-center text-xl">
      {{ $t('pages.chat.loginPrompt') }}
    </div>

    <SidebarProvider v-else>
      <ChatSidebar />
      <ChatInterface class="h-full w-full" />
      <ChatFloatingMenu class="absolute left-2 top-2 z-10" />
    </SidebarProvider>
  </div>
</template>
