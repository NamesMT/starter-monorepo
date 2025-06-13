<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{
  href: string
  external?: boolean
}>()

const refinedTarget = computed(() => {
  if (props.href.startsWith('/') && !props.href.startsWith('//'))
    return '_self'
  if (props.href.startsWith('#'))
    return '_self'
  return '_blank'
})
</script>

<template>
  <NuxtLink :href="props.href" :target="refinedTarget" :external="props.external" class="prose-a">
    <slot />
  </NuxtLink>
</template>

<style scoped>
.prose-a {
  text-decoration: underline dotted;
  text-underline-offset: 4px;
}

.prose-a:hover {
  text-decoration: underline;
  color: var(--mdc-active-link);
}

.prose-a:has(code) {
  text-decoration: none !important;
}
</style>

<style>
a {
  color: inherit;
  text-decoration: inherit;
}

a:hover {
  text-decoration: underline;
}
</style>
