<script setup lang="ts">
import { useSidebar } from '@/lib/shadcn/components/ui/sidebar/utils'

const { open } = useSidebar()
</script>

<template>
  <div
    class="flex rounded-md p-1 transition-background-color"
    :class="[
      open ? '' : 'bg-sidebar-accent-foreground',
    ]"
  >
    <SidebarTrigger
      :class="[
        open ? '' : 'color-sidebar-accent',
      ]"
    />
  </div>
</template>
