<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from 'vue-router'

const siteConfig = useSiteConfig()

defineOgImage('Frame.takumi', {
  title: siteConfig.name,
  description: siteConfig.description,
})

/**
 * Must be a stable reference, not an inline arrow.
 *
 * `NuxtPage` watches `props.pageKey` and fires `page:loading:start` whenever its identity
 * changes. An inline arrow gets a fresh identity every time this slot is re-invoked (which
 * happens on any layout re-render), and the matching `page:loading:end` only fires once per
 * real navigation - so `NuxtLoadingIndicator` would appear and then stay stuck.
 */
function pageKey(route: RouteLocationNormalizedLoaded) {
  return route.name as string
}

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
          <NuxtPage :page-key="pageKey" />
        </NuxtLayout>
      </template>
    </div>
  </GlobalProvider>
</template>
