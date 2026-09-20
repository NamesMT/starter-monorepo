<script setup lang="ts">
import type { ChatAttachmentItem } from '~/utils/chat/attachments'
import { formatFileSize } from '@local/common/src/chat'

defineProps<{
  items: ChatAttachmentItem[]
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()
</script>

<template>
  <div v-if="items.length" class="flex flex-wrap gap-2">
    <div
      v-for="item in items" :key="item.id"
      class="group p-1.5 pr-6 border rounded-md bg-surface-200/50 flex gap-2 max-w-64 items-center relative"
      :class="item.status === 'error' ? 'border-destructive' : 'border-secondary-200 dark:border-secondary-800'"
    >
      <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.name" class="rounded shrink-0 h-9 w-9 object-cover">
      <div v-else class="i-hugeicons:file-01 shrink-0 h-9 w-9" />

      <span class="min-w-0">
        <span class="text-xs block truncate" :title="item.name">{{ item.name }}</span>
        <span class="text-xs opacity-70 block">
          {{ item.status === 'uploading' ? `${item.progress}%` : formatFileSize(item.size) }}
        </span>

        <span
          v-if="item.status === 'uploading'"
          class="mt-1 rounded bg-secondary-300/40 h-1 w-full block overflow-hidden"
        >
          <span class="h-full block transition-all bg-mainGradient" :style="{ width: `${item.progress}%` }" />
        </span>

        <span v-if="item.status === 'error'" class="text-xs text-destructive block truncate" :title="item.error">
          {{ item.error }}
        </span>
      </span>

      <button
        type="button"
        class="opacity-60 transition-opacity right-1 top-1 absolute hover:opacity-100"
        :aria-label="`Remove ${item.name}`"
        @click="emit('remove', item.id)"
      >
        <div class="i-hugeicons:cancel-01 h-4 w-4" />
      </button>
    </div>
  </div>
</template>
