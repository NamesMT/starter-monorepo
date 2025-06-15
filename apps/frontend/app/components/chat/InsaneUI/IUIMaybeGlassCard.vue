<script setup lang="ts">
import IUIMaybeGlass from './IUIMaybeGlass.vue'

const chatContext = useChatContext()
</script>

<template>
  <IUIMaybeGlass
    :class="chatContext.insaneUI.value
      ? 'text-shadow bg-secondary/20 text-primary-950 dark:(bg-primary/20 text-secondary-50)'
      : 'text-gray-500 dark:text-gray-400'"
  >
    <slot />
  </IUIMaybeGlass>
</template>
