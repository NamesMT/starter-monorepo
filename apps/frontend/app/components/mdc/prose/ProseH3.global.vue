<script setup lang="ts">
import { computed, useRuntimeConfig } from '#imports'

const props = defineProps<{ id?: string }>()

const { headings } = useRuntimeConfig().public.mdc

const generate = computed(
  () => !!props.id && typeof headings?.anchorLinks === 'object' && !!headings.anchorLinks.h3,
)
</script>

<template>
  <h3 :id="props.id" class="prose-h3">
    <NuxtLink v-if="generate" :href="`#${id}`">
      <slot />
    </NuxtLink>
    <slot v-else />
  </h3>
</template>

<style scoped>
.prose-h3 {
  scroll-margin: 5rem;
  letter-spacing: -0.025em;
  text-decoration: none;

  font-size: 1.375rem;
  line-height: 1.25;
  font-weight: 600;
  margin: 1.5rem 0 0.5em;
}
</style>
