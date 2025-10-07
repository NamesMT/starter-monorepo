<script setup lang="ts">
import type { ConvexVueContext } from 'convex-vue'

definePageMeta({
  title: 'pages.test.title',
})

const convexVueContext = inject<ConvexVueContext>('convex-vue')
</script>

<template>
  <div class="text-center flex flex-col gap-6 w-full items-center justify-center">
    <div class="p-4 border rounded-lg max-w-2xl w-full shadow">
      <h2 class="text-2xl font-semibold mb-2">
        {{ $t('pages.test.title') }}
      </h2>
      <p class="text-sm text-gray-600 mb-4 dark:text-gray-400">
        {{ $t('pages.test.description') }}
      </p>
      <p>{{ $t('pages.test.intro') }}</p>
    </div>

    <div class="p-4 border rounded-lg max-w-2xl w-full shadow">
      <h2 class="text-xl font-semibold mb-3">
        {{ $t('pages.test.section.convex.title') }}
      </h2>
      <div class="flex flex-col gap-4 items-center">
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
