<script setup lang="ts">
const isDev = import.meta.dev
</script>

<template>
  <div class="bg-surface-0 flex flex-col items-center inset-0 justify-center fixed z-50 dark:bg-surface-900">
    <div class="spinner mb-4 h-9 w-9" />
    <p class="text-lg text-primary-500 font-medium dark:text-primary-400">
      {{ $t('components.loadingScreen.loadingText') }}
    </p>

    <!-- IsSST Section -->
    <div v-if="isDev" class="mt-20 p-4 border rounded-lg max-w-2xl w-full shadow">
      <h2 class="text-xl font-semibold mb-3">
        {{ $t('pages.home.section.sst.title') }}
      </h2>
      <div class="flex justify-center">
        <IsSST />
      </div>
    </div>
  </div>
</template>
