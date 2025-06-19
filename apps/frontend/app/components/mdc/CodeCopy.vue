<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'

const props = defineProps<{
  code: string
}>()

const bus = useEventBus('mdc:copied')
const { copy, copied } = useClipboard({ legacy: true })

whenever(copied, () => {
  bus.emit(props.code)
})
</script>

<template>
  <div class="code-copy" @click="copy(props.code)">
    <Transition name="copy-fade" mode="out-in">
      <Copy v-if="!copied" class="size-4" />
      <Check v-else class="size-4" />
    </Transition>
  </div>
</template>

<style scoped>
.copy-fade-enter-active,
.copy-fade-leave-active {
  transition: opacity 0.2s ease;
}

.copy-fade-enter-from,
.copy-fade-leave-to {
  opacity: 0;
}

.code-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px;
  border-radius: 4px;
  height: 30px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.code-copy:hover {
  background-color: var(--mdc-secondary);
}

.code-copy .iconify {
  display: block;
  align-self: center;
  cursor: pointer;
  color: var(--mdc-muted-foreground);
}

.code-copy .iconify:hover {
  color: var(--mdc-primary);
}
</style>
