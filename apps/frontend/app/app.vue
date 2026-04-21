<script setup lang="ts">
defineOgImage('Frame.takumi', {
  title: `Hello! I'm starter-monorepo 👋`,
  description: 'Monorepo with 🤖 AI initialize and localize | 🔥Hono + OpenAPI & RPC, Nuxt, Convex, SST Ion, WorkOS AuthKit, Tanstack Query, Shadcn, UnoCSS, Spreadsheet I18n, Lingo.dev',
})

const { $init } = useNuxtApp()
onMounted(async () => {
  await nextTick()
  $init.mounted = true
})
</script>

<template>
  <GlobalProvider>
    <div>
      <template v-if="!$init.mounted">
        <NuxtLayout name="basic">
          <!-- Named NuxtPage prop is unusable, but Nuxt warns when there's no NuxtPage, so we put this, $dummy renders nothing -->
          <NuxtPage name="$dummy" />
          <LoadingScreen />
        </NuxtLayout>
      </template>
      <template v-else>
        <NuxtLayout>
          <NuxtPage :page-key="(route) => (route.name as string)" />
        </NuxtLayout>
      </template>
    </div>
  </GlobalProvider>
</template>
