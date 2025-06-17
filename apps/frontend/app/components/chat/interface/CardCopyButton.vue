<script setup lang="ts">
const {
  message,
} = defineProps<{
  message: CustomMessage
}>()
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <CodeCopy :code="message.content" class="hover:text-accent-foreground hover:bg-accent!" />
    </TooltipTrigger>
    <TooltipContent side="bottom" :side-offset="6">
      <p>{{ $t('chat.message.copy') }}</p>
    </TooltipContent>
  </Tooltip>
</template>
