<script setup lang="ts">
import type { Doc } from 'backend-convex/convex/_generated/dataModel'
import { Split } from 'lucide-vue-next'

const {
  thread,
} = defineProps<{
  thread: Doc<'threads'>
}>()

const { threadsKeyed } = useChatContext()

if (!thread.parentThread)
  console.error('`parentThread` requried')
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <NuxtLink
        :to="`/chat/${thread.parentThread}`"
        class="size-4"
      >
        <Button variant="link" size="icon" class="text-current opacity-40 size-4 transition-opacity hover:(text-primary opacity-100)">
          <Split />
        </Button>
      </NuxtLink>
    </TooltipTrigger>
    <TooltipContent side="bottom" :side-offset="6">
      <p>{{ $t('chat.thread.branchedFrom', { title: threadsKeyed[thread.parentThread!]?.title }) }}</p>
    </TooltipContent>
  </Tooltip>
</template>
