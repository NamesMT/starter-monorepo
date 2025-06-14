<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/shadcn/utils'
import { Separator } from '@/lib/shadcn/components/ui/separator'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Separator
    data-sidebar="separator"
    :class="cn('mx-2 w-auto bg-sidebar-border', props.class)"
  >
    <slot />
  </Separator>
</template>
