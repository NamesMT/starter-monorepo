<script setup lang="ts">
import type { ConvexVueContext } from 'convex-vue'

definePageMeta({
  title: 'pages.test.title',
})

const convexVueContext = inject<ConvexVueContext>('convex-vue')
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center">
    <div>This is just a simple page to test stuff</div>

    <div class="flex flex-col items-center gap-4 py-6">
      <template v-if="!convexVueContext?.clientRef?.value">
        <div class="text-xl">
          Convex integration: <i>not found</i>
        </div>
      </template>
      <ConvexIntegrationTest v-else />
    </div>
  </div>
</template>
