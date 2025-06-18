<!-- This module provides global components like search dialogs -->
<script setup lang="ts">
const searchDialogOpen = ref(false)
</script>

<template>
  <slot />

  <div class="absolute hidden">
    <ChatSearchDialog v-model:open="searchDialogOpen" />
  </div>
</template>
