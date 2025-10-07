<script setup lang="ts">
import { useSidebar } from '@/lib/shadcn/components/ui/sidebar/utils'
import { useToast } from '~/lib/shadcn/components/ui/toast'

const { toast } = useToast()
const { t } = useI18n()
const firstTimeOpen = useLocalState('chat/firstTimeOpen', () => true)

// `state` does not apply to mobile, so we uses 3 props instead
const { isMobile, openMobile, open } = useSidebar()

const isExpanded = computed(() => isMobile.value ? openMobile.value : open.value)

if (firstTimeOpen.value) {
  until(isExpanded).toBeTruthy().then(() => {
    toast({ description: t('chat.toast.menuOpenedFirstTime') })
    firstTimeOpen.value = false
  })
}
</script>

<template>
  <div
    class="p-1 rounded-md flex transition-background-color"
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
