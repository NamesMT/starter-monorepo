<script setup lang="ts">
import type { ListboxFilterProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Slash } from 'lucide-vue-next'
import { ListboxFilter, useForwardProps } from 'reka-ui'
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
  <div class="px-3 border-b flex items-center relative" cmdk-input-wrapper>
    <div class="mr-3 flex items-center">
      <div class="i-hugeicons:search-01 opacity-50 shrink-0 h-4 w-4" />
      <Slash class="opacity-20 shrink-0 skew-x-[30deg] size-3!" />
      <div class="i-hugeicons:comment-add-02 opacity-50 shrink-0 h-4 w-4" />
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
    <div class="right-3 absolute -bottom-6">
      <div v-show="filterState.search" class="text-xs text-muted-foreground flex gap-1 items-center">
        <kbd v-if="filterState.filtered.count" class="text-muted font-sans px-2 rounded bg-muted-foreground">Ctrl</kbd>
        <kbd class="text-muted font-sans px-2 rounded bg-muted-foreground">↵</kbd>
        <div>{{ $t('chat.components.chatSearchDialog.enterToSend.p2') }}</div>
      </div>
    </div>
  </div>
</template>
