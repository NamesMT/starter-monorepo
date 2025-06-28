<script setup lang="ts">
defineOgImageComponent('Frame', {
  title: `Hello! I'm starter-monorepo 👋`,
  description: 'Monorepo with 🤖 AI initialize and localize | 🔥Hono + OpenAPI & RPC, Nuxt, Convex, SST Ion, Kinde Auth, Tanstack Query, Shadcn, UnoCSS, Spreadsheet I18n, Lingo.dev',
  colorMode: 'dark',
})

const { $init } = useNuxtApp()
onMounted(async () => {
  await nextTick()
  $init.mounted = true
})
</script>

<template>
  <div>Hello</div>
</template>
