<script setup lang="ts">
import ChatRootApp from '~/components/chat/ChatRootApp.vue'

definePageMeta({
  layout: 'basic',
  middleware: ['accept-shared-thread'],
})
</script>

<template>
  <div class="flex w-full items-center justify-center">
    <!-- <div v-if="!$auth.loggedIn" class="h-full w-full flex items-center justify-center text-xl">
      {{ $t('pages.chat.loginPrompt') }}
    </div> -->

    <ChatRootApp />
  </div>
</template>
