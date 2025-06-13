<script setup lang="ts">
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

    <template v-else>
      <div class="relative h-screen max-w-76 min-w-64 w-1/6">
        <ChatSidebar class="absolute left-0 top-0 h-full w-full" />
      </div>
      <div class="h-screen w-full overflow-y-auto">
        <ChatInterface />
      </div>
    </template>
  </div>
</template>
