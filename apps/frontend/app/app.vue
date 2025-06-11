<script setup lang="ts">
import type { ConvexVueContext } from 'convex-vue'

defineOgImageComponent('NuxtSeo', {
  title: `Hello! I'm starter-monorepo 👋`,
  description: 'Monorepo with 🤖 AI initialize and localize | 🔥Hono + OpenAPI & RPC, Nuxt, Convex, SST Ion, Kinde Auth, Tanstack Query, Shadcn, UnoCSS, Spreadsheet I18n, Lingo.dev',
  theme: '#bf83fc',
  colorMode: 'dark',
})

const { $init, $auth } = useNuxtApp()
onMounted(async () => {
  await nextTick()
  $init.mounted = true
})

// Init convex client if url configured
const convexVueContext = inject<ConvexVueContext>('convex-vue')
// Don't init if on server, see https://github.com/chris-visser/convex-vue/issues/6
if (import.meta.client && convexVueContext?.options?.url) {
  convexVueContext.initClient(convexVueContext.options)
  // Also set auth hook for the client
  convexVueContext.clientRef.value?.setAuth(async () => {
    return $auth.token
  })
}
</script>

<template>
  <div>
    <template v-if="!$init.mounted">
      <NuxtLayout name="loading">
        <!-- `name="loading"` prop is unusable, but Nuxt warns when there's no NuxtPage, so we put this -->
        <NuxtPage name="$dummy" />
        <LoadingScreen />
      </NuxtLayout>
    </template>

    <template v-else>
      <GlobalRegister />

      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </template>
  </div>
</template>
