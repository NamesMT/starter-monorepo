<!-- This module provides global components like search dialogs -->
<script lang="ts">
import { createContext } from 'reka-ui'

export const [useChatGlobalsContext, provideChatGlobalsContext] = createContext<{
  searchDialogOpen: Ref<boolean>
  generalSettingsOpen: Ref<boolean>
}>('chat/globals')
</script>

<script setup lang="ts">
const searchDialogOpen = ref(false)
const generalSettingsOpen = ref(false)

provideChatGlobalsContext({
  searchDialogOpen,
  generalSettingsOpen,
})
</script>

<template>
  <slot />

  <div class="hidden absolute">
    <ChatSearchDialog v-model:open="searchDialogOpen" />
    <GeneralSettingsSheet />
  </div>
</template>
