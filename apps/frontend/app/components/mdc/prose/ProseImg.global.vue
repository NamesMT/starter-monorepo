<script setup lang="ts">
import { computed, useRuntimeConfig } from '#imports'
import { joinURL, withLeadingSlash, withTrailingSlash } from 'ufo'

const props = withDefaults(
  defineProps<{
    src: string
    title?: string
    alt?: string
    width?: string | number
    height?: string | number
  }>(),
  {},
)

const { app } = useRuntimeConfig()

const refinedSrc = computed(() => {
  if (props.src?.startsWith('/') && !props.src.startsWith('//')) {
    const _base = withLeadingSlash(withTrailingSlash(app.baseURL))
    if (_base !== '/' && !props.src.startsWith(_base))
      return joinURL(_base, props.src)
  }
  return props.src
})
</script>

<template>
  <span class="prose-img-wrapper">
    <NuxtImg
      :src="refinedSrc"
      :alt="props.alt"
      :width="props.width"
      :height="props.height"
      :title="props.title"
      class="prose-img"
    />
    <span v-if="alt" name="title">{{ props.title || props.alt }}</span>
  </span>
</template>

<style scoped>
.prose-img-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin: 1em 0;
}

.prose-img {
  width: 100%;
  border-radius: 6px;
}

.prose-img-wrapper [name='title'] {
  text-align: center;
  color: var(--mdc-muted-foreground);
  font-size: 0.75rem;
  font-weight: 500;
}
</style>

<style>
.prose-a .prose-img-wrapper {
  display: inline-block;
  margin: 0;
  padding-right: 0.5em;
}

.prose-a .prose-img-wrapper .prose-img {
  width: auto;
  min-height: 1.25rem;
  border-radius: 0;
}

.prose-a .prose-img-wrapper [name='title'] {
  display: none;
}
</style>
