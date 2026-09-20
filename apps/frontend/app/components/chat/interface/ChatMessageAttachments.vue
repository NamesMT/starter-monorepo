<script setup lang="ts">
import type { CustomAttachment } from '~/utils/chat/chat'
import { formatFileSize } from '@local/common/src/chat'

defineProps<{
  attachments: CustomAttachment[]
}>()

function isImage(attachment: CustomAttachment) {
  return attachment.type.startsWith('image/')
}
</script>

<template>
  <div v-if="attachments.length" class="mt-2 flex flex-wrap gap-2">
    <template v-for="attachment in attachments" :key="attachment.storageId">
      <a
        v-if="isImage(attachment) && attachment.url"
        :href="attachment.url" target="_blank" rel="noopener noreferrer"
        class="border border-secondary-200 rounded-md block overflow-hidden dark:border-secondary-800"
      >
        <img :src="attachment.url" :alt="attachment.name" class="h-28 w-28 object-cover">
      </a>

      <a
        v-else-if="attachment.url"
        :href="attachment.url" target="_blank" rel="noopener noreferrer"
        class="p-2 pr-3 border border-secondary-200 rounded-md bg-surface-200/50 flex gap-2 max-w-64 items-center dark:border-secondary-800"
        :title="attachment.name"
      >
        <div class="i-hugeicons:file-01 shrink-0 h-6 w-6" />
        <span class="min-w-0">
          <span class="text-sm block truncate">{{ attachment.name }}</span>
          <span class="text-xs opacity-70 block">{{ formatFileSize(attachment.size) }}</span>
        </span>
      </a>

      <div
        v-else
        class="p-2 pr-3 border border-secondary-200 rounded-md bg-surface-200/50 flex gap-2 max-w-64 items-center dark:border-secondary-800"
        :title="attachment.name"
      >
        <div class="i-hugeicons:file-01 shrink-0 h-6 w-6" />
        <span class="min-w-0">
          <span class="text-sm block truncate">{{ attachment.name }}</span>
          <span class="text-xs opacity-70 block">{{ formatFileSize(attachment.size) }}</span>
        </span>
      </div>
    </template>
  </div>
</template>
