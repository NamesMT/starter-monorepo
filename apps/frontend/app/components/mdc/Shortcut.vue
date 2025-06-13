<script setup lang="ts">
import { computed, onMounted, ref } from '#imports'

const props = withDefaults(
  defineProps<{
    value: string
    size?: 'xs' | 'sm' | 'md'
  }>(),
  {
    size: 'sm',
  },
)

const metaSymbol = ref('Ctrl')

onMounted(() => {
  metaSymbol.value
    = navigator && navigator.userAgent && /Macintosh;/.test(navigator.userAgent) ? '⌘' : 'Ctrl'
})

const computedValue = computed(() => (props.value === 'meta' ? metaSymbol : props.value))
</script>

<template>
  <kbd class="shortcut" :class="[props.size]">
    {{ computedValue }}
  </kbd>
</template>

<style scoped>
.shortcut {
  background-color: var(--mdc-muted);
  border: 1px solid var(--mdc-border);
  pointer-events: none;
  height: 20px;
  display: inline-flex;
  user-select: none;
  align-items: center;
  gap: 4px;
  border-radius: 4px;
  font-weight: 500;
  box-shadow:
    0 0 #0000,
    0 0 #0000,
    0px 1.5px 0px #0000001a;
}

.shortcut.xs {
  height: 16px;
  min-height: 16px;
  font-size: 10px;
  padding: 0 4px;
}

.shortcut.sm {
  height: 20px;
  min-height: 20px;
  font-size: 11px;
  padding: 0 4px;
}

.shortcut.md {
  height: 24px;
  min-height: 24px;
  font-size: 12px;
  padding: 0 6px;
}
</style>
