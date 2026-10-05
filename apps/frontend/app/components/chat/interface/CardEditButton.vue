<script setup lang="ts">
const { message } = defineProps<{
  message: CustomMessage
}>()

const emit = defineEmits<{
  edit: []
}>()

/** Only a settled user message can be rewritten; a streaming reply depends on it. */
const canEdit = computed(() => message.role === 'user' && !message.isStreaming)
</script>

<template>
  <Tooltip v-if="canEdit">
    <TooltipTrigger as-child>
      <Button
        variant="ghost" size="icon" class="p-1 rounded-full size-7"
        :aria-label="$t('chat.message.edit')"
        @click="emit('edit')"
      >
        <div class="i-hugeicons:pencil-edit-02 h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" :side-offset="6">
      <p>{{ $t('chat.message.edit') }}</p>
    </TooltipContent>
  </Tooltip>
</template>
