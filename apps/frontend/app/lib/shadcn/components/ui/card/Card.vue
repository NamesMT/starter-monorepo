<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/shadcn/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    :class="
      cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
