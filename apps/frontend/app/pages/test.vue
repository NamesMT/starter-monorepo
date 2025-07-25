<script setup lang="ts">
import type { ConvexVueContext } from 'convex-vue'

definePageMeta({
  title: 'pages.test.title',
})

const convexVueContext = inject<ConvexVueContext>('convex-vue')
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center gap-6 text-center">
    <div class="max-w-2xl w-full border rounded-lg p-4 shadow">
      <h2 class="mb-2 text-2xl font-semibold">
        {{ $t('pages.test.title') }}
      </h2>
      <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {{ $t('pages.test.description') }}
      </p>
      <p>{{ $t('pages.test.intro') }}</p>
    </div>

    <div class="max-w-2xl w-full border rounded-lg p-4 shadow">
      <h2 class="mb-3 text-xl font-semibold">
        {{ $t('pages.test.section.convex.title') }}
      </h2>
      <div class="flex flex-col items-center gap-4">
        <template v-if="!convexVueContext?.clientRef?.value">
          <div class="text-xl text-red-500">
            {{ $t('pages.test.section.convex.status.notFound') }}
          </div>
        </template>
        <ConvexIntegrationTest v-else />
      </div>
    </div>
  </div>
</template>
