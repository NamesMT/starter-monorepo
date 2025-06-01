<script setup lang="ts">
import GridMaker from '@local/common-vue/src/components/GridMaker.vue'

definePageMeta({
  title: 'pages.title.home',
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4 px-4 py-4 text-center">
    <div class="flex items-end gap-2">
      <GridMaker
        :value="[
          '* *',
          '***',
          '* *',
        ]"
      />
      <GridMaker
        class="[&_.GridMaker\_\_col]:nth-[1]:[&_.GridMaker\_\_row]:rounded-full"
        :value="[
          '*',
          '*',
          '*',
          '*',
        ]"
      />
    </div>

    <RouterView />

    <div>
      <IsSST />
    </div>
  </div>
</template>
