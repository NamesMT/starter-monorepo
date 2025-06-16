<script setup lang="ts">
import { useSidebar } from '@/lib/shadcn/components/ui/sidebar/utils'

// `state` does not apply to mobile, so we uses 3 props instead
const { isMobile, openMobile, open } = useSidebar()

const isExpanded = computed(() => isMobile.value ? openMobile.value : open.value)
</script>

<template>
  <div
    class="flex rounded-md p-1 transition-background-color"
    :class="[
      isExpanded ? 'bg-transparent' : 'bg-muted-foreground/30',
    ]"
  >
    <SidebarTrigger
      :class="[
        isExpanded ? '' : 'color-sidebar-accent',
      ]"
    />
  </div>
</template>
