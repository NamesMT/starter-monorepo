<script setup lang="ts">
import { getMessageText } from '@local/common/src/chat'
import { toast } from 'vue-sonner'
import Textarea from '#layers/nuxt-layer-common/app/lib/shadcn/components/ui/textarea/Textarea.vue'

const { message } = defineProps<{
  message: CustomMessage
}>()

const emit = defineEmits<{
  submit: [content: string]
  cancel: []
}>()

const editing = defineModel<boolean>('editing', { required: true })

const { ts } = useI18n()

const draft = ref('')

// Seed each time the editor opens, so reopening after a failed attempt starts from the
// current text rather than a stale draft. `immediate` matters because the parent mounts this
// with `editing` already true, which a plain watcher would never observe.
watch(editing, (isOpen) => {
  if (isOpen)
    draft.value = getMessageText(message.parts)
}, { immediate: true })

function submit() {
  const content = draft.value.trim()
  if (!content) {
    toast.error(ts('chat.toast.emptyMessage'))
    return
  }

  emit('submit', content)
}
</script>

<template>
  <div v-if="editing" class="flex flex-col gap-2">
    <Textarea
      v-model="draft"
      class="text-sm min-h-20"
      :aria-label="$t('chat.message.edit')"
      @keydown.enter.exact.prevent="submit"
      @keydown.esc="emit('cancel')"
    />
    <div class="flex gap-2 justify-end">
      <Button variant="ghost" size="sm" @click="emit('cancel')">
        {{ $t('cancel') }}
      </Button>
      <Button size="sm" @click="submit">
        {{ $t('confirm') }}
      </Button>
    </div>
  </div>
</template>
