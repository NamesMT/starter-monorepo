<script setup lang="ts">
import { Split } from 'lucide-vue-next'

const {
  message,
} = defineProps<{
  message: CustomMessage
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <Tooltip v-show="message.isStreaming === false">
    <TooltipTrigger as-child>
      <Button variant="ghost" size="icon" class="size-7" @click="emit('click')">
        <Split />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" :side-offset="6">
      <p>{{ $t('chat.message.branch') }}</p>
    </TooltipContent>
  </Tooltip>
</template>
