<script lang="ts">
import { createContext } from 'reka-ui'
import {
  CommandDialog,
} from '@/lib/shadcn/components/ui/command'

export const [useCSDContext, provideCSDContext] = createContext<{
  open: Ref<boolean>
}>('chat/CSD')
</script>

<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

const { Meta_k, Ctrl_k } = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey))
      e.preventDefault()
  },
})

whenever(() => Meta_k!.value || Ctrl_k!.value, () => {
  open.value = !open.value
})

provideCSDContext({ open })

// TODO: add custom `CommandDialog` component for fuzzy search
</script>

<template>
  <CommandDialog v-model:open="open" disable-overlay>
    <CSDDialogContent />
  </CommandDialog>
</template>
