<script setup lang="ts">
import {
  CommandEmpty,
  CommandGroup,
  CommandList,
  CommandSeparator,
} from '@/lib/shadcn/components/ui/command'
import { useCSDContext } from '../ChatSearchDialog.vue'

const { threads } = useChatContext()
const { open } = useCSDContext()
</script>

<template>
  <CSDInput :placeholder="$t('chat.components.chatSearchDialog.placeholder')" />
  <CommandList>
    <!-- Without the separator the UI is buggy -->
    <CommandSeparator />
    <CommandEmpty>{{ $t('chat.components.chatSearchDialog.noResultsFound') }}</CommandEmpty>
    <CommandGroup>
      <template #heading>
        <div class="text-sm flex gap-1">
          <div class="i-hugeicons:clock-01" />
          <div>{{ $t('recent') }}</div>
        </div>
      </template>

      <CSDItem
        v-for="thread of threads"
        :key="thread._id"
        :value="thread.title"
        @select="navigateTo({ path: `/chat/${thread._id}` }); open = false"
      >
        <span>{{ thread.title }}</span>
      </CSDItem>
    </CommandGroup>
  </CommandList>
</template>
