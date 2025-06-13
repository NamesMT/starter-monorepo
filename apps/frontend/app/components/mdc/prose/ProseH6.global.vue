<script setup lang="ts">
import { computed, useRuntimeConfig } from '#imports'

const props = defineProps<{ id?: string }>()

const { headings } = useRuntimeConfig().public.mdc

const generate = computed(
  () => !!props.id && typeof headings?.anchorLinks === 'object' && !!headings.anchorLinks.h6,
)
</script>

<template>
  <h6 :id="props.id" class="prose-h6">
    <NuxtLink v-if="generate" :href="`#${id}`">
      <slot />
    </NuxtLink>
    <slot v-else />
  </h6>
</template>

<style scoped>
.prose-h6 {
  scroll-margin: 5rem;
  letter-spacing: -0.025em;
  text-decoration: none;

  font-size: 1.125rem;
  line-height: 1.25;
  font-weight: 600;
}
</style>
