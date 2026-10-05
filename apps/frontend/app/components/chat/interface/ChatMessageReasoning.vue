<script setup lang="ts">
import type { ChatReasoningPart } from '@local/common/src/chat'

const { part, streaming = false } = defineProps<{
  part: ChatReasoningPart
  /** Whether the reply is still being written; part state is not persisted. */
  streaming?: boolean
}>()

/**
 * Open while thinking so it is visible, collapsed once settled to keep replies tidy.
 */
const open = ref(streaming)
watch(() => streaming, (value) => { open.value = value })
</script>

<template>
  <details class="text-sm my-2 border rounded-md opacity-80 overflow-hidden" :open="open">
    <summary class="px-2 py-1 bg-surface-200/40 flex gap-2 cursor-pointer items-center">
      <div class="i-hugeicons:brain-01 shrink-0 h-4 w-4" />
      <span>{{ $t('chat.message.thinking') }}</span>
      <div v-if="streaming" class="spinner ml-auto h-4 w-4" />
    </summary>

    <div class="px-2 py-1.5 whitespace-pre-wrap">
      {{ part.text }}
    </div>
  </details>
</template>
