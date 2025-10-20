<script setup lang="ts">
defineOgImageComponent('Frame', {
  title: `Hello! I'm starter-monorepo 👋`,
  description: 'Monorepo with 🤖 AI initialize and localize | 🔥Hono + OpenAPI & RPC, Nuxt, Convex, SST Ion, WorkOS AuthKit, Tanstack Query, Shadcn, UnoCSS, Spreadsheet I18n, Lingo.dev',
  colorMode: 'dark',
})

const { $init } = useNuxtApp()
onMounted(async () => {
  await nextTick()
  $init.mounted = true
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <TooltipProvider :delay-duration="500">
    <div>
      <template v-if="!$init.mounted">
        <NuxtLayout name="basic">
          <!-- `name="loading"` prop is unusable, but Nuxt warns when there's no NuxtPage, so we put this -->
          <NuxtPage name="$dummy" />
          <LoadingScreen />
        </NuxtLayout>
      </template>

      <template v-else>
        <GlobalRegister />

        <NuxtLayout>
          <NuxtPage :page-key="(route) => (route.name as string)" />
        </NuxtLayout>
      </template>
    </div>
  </TooltipProvider>
</template>
