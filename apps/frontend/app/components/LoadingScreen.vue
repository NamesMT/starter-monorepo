<script setup lang="ts">
const isDev = import.meta.dev
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-0 dark:bg-surface-900">
    <div class="spinner mb-4 h-9 w-9" />
    <p class="text-lg text-primary-500 font-medium dark:text-primary-400">
      {{ $t('components.loadingScreen.loadingText') }}
    </p>

    <!-- IsSST Section -->
    <div v-if="isDev" class="mt-20 max-w-2xl w-full border rounded-lg p-4 shadow">
      <h2 class="mb-3 text-xl font-semibold">
        {{ $t('pages.home.section.sst.title') }}
      </h2>
      <div class="flex justify-center">
        <IsSST />
      </div>
    </div>
  </div>
</template>
