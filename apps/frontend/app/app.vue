<script setup lang="ts">
defineOgImageComponent('NuxtSeo', {
  title: `Hello! I'm starter-monorepo 👋`,
  description: 'Hono RPC, Nuxt, SST Ion, Kinde Auth, Tanstack Query, Shadcn, Primevue, UnoCSS',
  theme: '#bf83fc',
  colorMode: 'dark',
})

const { $init } = useNuxtApp()
onMounted(async () => {
  await nextTick()
  $init.mounted = true
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
