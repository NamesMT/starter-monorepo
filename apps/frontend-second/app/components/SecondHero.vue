<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <section class="p-6 border rounded-xl bg-surface-100 shadow dark:bg-surface-800">
    <slot name="eyebrow">
      <p class="text-xs text-primary-500 tracking-wide font-semibold uppercase">
        frontend-second
      </p>
    </slot>
    <h1 class="text-3xl font-bold mt-1">
      {{ title }}
    </h1>
    <p class="text-surface-600 mt-2 dark:text-surface-300">
      {{ subtitle }}
    </p>
    <slot />
  </section>
</template>
