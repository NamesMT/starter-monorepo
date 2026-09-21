<script setup lang="ts">
const route = useRoute()
const { ts } = useI18n()

const title = computed(() => route.meta.title ? ts(route.meta.title as string) : undefined)

useHead(() => ({
  htmlAttrs: { class: 'font-sans' },
  title: title.value,
}))
</script>

<template>
  <div class="flex flex-col w-full min-h-dvh">
    <!-- NuxtPage -->
    <main id="app-body" class="flex grow">
      <slot />
    </main>
  </div>
</template>
