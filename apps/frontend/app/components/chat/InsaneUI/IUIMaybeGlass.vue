<script setup lang="ts">
import LiquidGlassDiv from '~/components/LiquidGlassDiv.vue'

const chatContext = useChatContext()
</script>

<template>
  <component
    :is="chatContext.insaneUI.value ? LiquidGlassDiv : 'div'"
    class="rounded-$cr $c-radius=$cr $cr=$radius"
  >
    <slot />
  </component>
</template>
