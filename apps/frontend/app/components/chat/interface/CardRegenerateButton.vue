<script setup lang="ts">
const { message } = defineProps<{
  message: CustomMessage
}>()

const emit = defineEmits<{
  regenerate: []
}>()

/** Regenerating only makes sense on a settled assistant reply. */
const canRegenerate = computed(() => message.role === 'assistant' && !message.isStreaming)
</script>

<template>
  <Tooltip v-if="canRegenerate">
    <TooltipTrigger as-child>
      <Button
        variant="ghost" size="icon" class="p-1 rounded-full size-7"
        :aria-label="$t('chat.message.regenerate')"
        @click="emit('regenerate')"
      >
        <div class="i-hugeicons:refresh h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" :side-offset="6">
      <p>{{ $t('chat.message.regenerate') }}</p>
    </TooltipContent>
  </Tooltip>
</template>
