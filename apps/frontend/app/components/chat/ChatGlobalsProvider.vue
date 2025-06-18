<!-- This module provides global components like search dialogs -->
<script setup lang="ts">
</script>

<template>
  <slot />

  <div class="absolute hidden">
    <ChatSearchDialog :open="true" />
  </div>
</template>
