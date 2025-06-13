<script setup lang="ts">
import { computed, useRuntimeConfig } from '#imports'

const props = defineProps<{ id?: string }>()

const { headings } = useRuntimeConfig().public.mdc

const generate = computed(
  () => !!props.id && typeof headings?.anchorLinks === 'object' && !!headings.anchorLinks.h2,
)
</script>

<template>
  <h2 :id="props.id" class="prose-h2">
    <NuxtLink v-if="generate" :href="`#${id}`">
      <slot />
    </NuxtLink>
    <slot v-else />
  </h2>
</template>

<style scoped>
.prose-h2 {
  scroll-margin: 5rem;
  letter-spacing: -0.025em;
  text-decoration: none;

  font-size: 1.75em;
  transition: color 0.2s ease-in-out;
  margin: 1.75rem 0 0.5em;
  line-height: 1.25;
  font-weight: 600;
}
</style>
