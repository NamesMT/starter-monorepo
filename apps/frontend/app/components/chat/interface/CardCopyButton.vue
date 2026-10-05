<script setup lang="ts">
import { getMessageText } from '@local/common/src/chat'

const {
  message,
} = defineProps<{
  message: CustomMessage
}>()

/** Only the answer text, not thinking or tool payloads. */
const text = computed(() => getMessageText(message.parts))
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <CodeCopy v-if="text" :code="text" class="hover:text-accent-foreground hover:bg-accent!" />
    </TooltipTrigger>
    <TooltipContent side="bottom" :side-offset="6">
      <p>{{ $t('chat.message.copy') }}</p>
    </TooltipContent>
  </Tooltip>
</template>
