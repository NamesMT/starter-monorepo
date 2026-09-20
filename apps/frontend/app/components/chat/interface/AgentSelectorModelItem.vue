<script setup lang="ts">
import type {
  AgentObject,
} from '@local/common/src/chat'

const {
  provider,
  model,
  modelSettings,
} = defineProps<Omit<AgentObject, 'apiKey'>>()

const chatContext = useChatContext()
</script>

<template>
  <DropdownMenuItem @select="chatContext.agentsSettings.value.selectedAgent = `${provider}/${model}`">
    <span>{{ model }}</span>
    <DropdownMenuShortcut class="text-base flex gap-1">
      <span v-if="modelSettings?.attachments?.length">📎</span>
      <span v-if="modelSettings?.tools">🔧</span>
    </DropdownMenuShortcut>
  </DropdownMenuItem>
</template>
