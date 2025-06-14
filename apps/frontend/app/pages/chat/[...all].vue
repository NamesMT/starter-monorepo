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

    <div v-else class="w-full flex flex-row-reverse items-center">
      <div class="h-screen w-full overflow-y-auto">
        <ChatInterface />
      </div>
      <div class="relative z-5 h-screen max-w-76 min-w-64 w-1/6 max-md:(absolute left-0 translate-x-0 -translate-x-100%)">
        <ChatSidebar class="absolute left-0 top-0 h-full w-full" />
      </div>
    </div>
  </div>
</template>
