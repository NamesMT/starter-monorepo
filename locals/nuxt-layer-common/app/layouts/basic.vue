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
  <div>
    <div class="flex flex-col w-full min-h-dvh">
      <!-- NuxtPage -->
      <div id="app-body" class="flex grow">
        <slot />
      </div>
    </div>
  </div>
</template>
