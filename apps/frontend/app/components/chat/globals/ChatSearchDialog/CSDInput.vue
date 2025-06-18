<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Slash } from 'lucide-vue-next'
import { ListboxFilter, type ListboxFilterProps, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/shadcn/utils'
import { useCommand } from '~/lib/shadcn/components/ui/command'
import { useCSDContext } from '../ChatSearchDialog.vue'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<ListboxFilterProps & {
  class?: HTMLAttributes['class']
}>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)

const { filterState } = useCommand()
const { open } = useCSDContext()

function _newChat() {
  newThreadAndSubmit(filterState.search)
  open.value = false
}
</script>

<template>
  <div class="relative flex items-center border-b px-3" cmdk-input-wrapper>
    <div class="mr-3 flex items-center">
      <div class="i-hugeicons:search-01 h-4 w-4 shrink-0 opacity-50" />
      <Slash class="shrink-0 skew-x-[30deg] opacity-20 size-3!" />
      <div class="i-hugeicons:comment-add-02 h-4 w-4 shrink-0 opacity-50" />
    </div>
    <ListboxFilter
      v-bind="{ ...forwardedProps, ...$attrs }"
      v-model="filterState.search"
      auto-focus
      :class="cn('flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50', props.class)"
      @keydown.enter="(e: KeyboardEvent) => {
        if (filterState.search && (!filterState.filtered.count || e.ctrlKey))
          _newChat()
      }"
    />
    <div class="absolute right-3 -bottom-6">
      <div v-show="filterState.search" class="flex items-center gap-1 text-xs text-muted-foreground">
        <kbd v-if="filterState.filtered.count" class="rounded bg-muted-foreground px-2 text-muted font-sans">Ctrl</kbd>
        <kbd class="rounded bg-muted-foreground px-2 text-muted font-sans">↵</kbd>
        <div>{{ $t('chat.components.chatSearchDialog.enterToSend.p2') }}</div>
      </div>
    </div>
  </div>
</template>
