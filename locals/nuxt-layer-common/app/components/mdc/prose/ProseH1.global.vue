<script setup lang="ts">
import { computed, useRuntimeConfig } from '#imports'

const props = defineProps<{ id?: string }>()

const { headings } = useRuntimeConfig().public.mdc

const generate = computed(
  () => !!props.id && typeof headings?.anchorLinks === 'object' && !!headings.anchorLinks.h1,
)
</script>

<template>
  <h1 :id="props.id" class="prose-h1">
    <NuxtLink v-if="generate" :href="`#${id}`">
      <slot />
    </NuxtLink>
    <slot v-else />
  </h1>
</template>

<style scoped>
.prose-h1 {
  scroll-margin: 5rem;
  letter-spacing: -0.025em;
  text-decoration: none;

  line-height: 1.25;
  font-weight: 600;
  font-size: 2.25rem;
  margin: 1rem 0;
}
</style>
