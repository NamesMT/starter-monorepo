<script setup lang="ts">
import type { ChatToolPart } from '@local/common/src/chat'

defineProps<{
  invocations: ChatToolPart[]
}>()

function formatValue(value: unknown) {
  if (value === undefined)
    return ''

  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return String(value)
  }
}

function stateLabelKey(state: ChatToolPart['state']) {
  switch (state) {
    case 'output-available':
      return 'chat.tool.state.result'
    case 'output-error':
      return 'chat.tool.state.error'
    default:
      return 'chat.tool.state.call'
  }
}
</script>

<template>
  <div v-if="invocations.length" class="mt-2 flex flex-col gap-1.5">
    <details
      v-for="invocation in invocations" :key="invocation.toolCallId"
      class="text-xs border rounded-md overflow-hidden"
    >
      <summary class="px-2 py-1 bg-surface-200/40 flex gap-2 cursor-pointer items-center">
        <div class="i-hugeicons:wrench-01 shrink-0 h-4 w-4" />
        <span class="font-medium font-mono">{{ invocation.toolName }}</span>
        <span class="ml-auto opacity-70">{{ $t(stateLabelKey(invocation.state)) }}</span>
      </summary>

      <div class="p-2 flex flex-col gap-2">
        <div v-if="invocation.input !== undefined">
          <div class="opacity-70">
            {{ $t('chat.tool.input') }}
          </div>
          <pre class="text-white p-1.5 rounded bg-black/80 overflow-x-auto">{{ formatValue(invocation.input) }}</pre>
        </div>

        <div v-if="invocation.output !== undefined">
          <div class="opacity-70">
            {{ $t('chat.tool.output') }}
          </div>
          <pre class="text-white p-1.5 rounded bg-black/80 overflow-x-auto">{{ formatValue(invocation.output) }}</pre>
        </div>

        <div v-if="invocation.errorText">
          <div class="text-destructive">
            {{ $t('chat.tool.error') }}
          </div>
          <pre class="p-1.5 rounded bg-destructive/10 overflow-x-auto">{{ invocation.errorText }}</pre>
        </div>
      </div>
    </details>
  </div>
</template>
