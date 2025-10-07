<script setup lang="ts">
import type { Doc } from 'backend-convex/convex/_generated/dataModel'

const {
  thread,
} = defineProps<{
  thread: Doc<'threads'>
}>()

if (!thread.frozen)
  console.warn('`frozen` is expected')
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button variant="link" size="icon" class="text-current opacity-40 size-4 transition-color hover:(text-primary opacity-100)">
        <div class="i-hugeicons:snow" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" :side-offset="6">
      <p>{{ $t('chat.thread.frozen') }}</p>
    </TooltipContent>
  </Tooltip>
</template>
