<script setup lang="ts">
import type { ConvexVueContext } from 'convex-vue'

// const theme = useTheme()
const convexVueContext = inject<ConvexVueContext>('convex-vue')
</script>

<template>
  <header class="grid grid-cols-12 h-73px items-center text-h-4 view-transition-header xl:gap-10">
    <div class="col-span-3 h-full flex items-center justify-start gap-2 py-4 text-xl">
      <NuxtLink to="https://github.com/NamesMT/starter-monorepo" external target="_blank" class="h-full flex items-center gap-3 text-h-3 font-black">
        <Logo class="h-full text-surface-900 dark:text-surface-0" />
        <h1 class="whitespace-nowrap max-sm:hidden">
          starter-monorepo
        </h1>
      </NuxtLink>
    </div>

    <div
      class="col-span-6 flex flex-row justify-center gap-2 py-2.5 text-surface-700 font-medium 2xl:gap-8 lg:gap-5 md:gap-4 sm:gap-3 xl:gap-6 [&>*]:(px-2) dark:text-surface-300"
    >
      <NuxtLink
        to="/" class="group flex items-center"
        exact-active-class="text-secondary border-b-2px border-secondary"
      >
        <span class="transition-all group-hover:text-h-3 group-hover:text-accent-foreground">{{ $t('pages.home.title') }}</span>
      </NuxtLink>
      <NuxtLink
        to="/test" class="group flex items-center"
        exact-active-class="text-secondary border-b-2px border-secondary"
      >
        <span class="transition-all group-hover:text-h-3 group-hover:text-accent-foreground">{{ $t('pages.test.title') }}</span>
      </NuxtLink>
      <NuxtLink
        v-if="convexVueContext?.clientRef?.value"
        to="/chat" class="group flex items-center"
        exact-active-class="text-secondary border-b-2px border-secondary"
      >
        <span class="transition-all group-hover:text-h-3 group-hover:text-accent-foreground">{{ $t('pages.chat.title') }}</span>
      </NuxtLink>
    </div>

    <div class="col-span-3 flex">
      <div class="flex grow items-center justify-end gap-4">
        <LanguageDropdown />
      </div>
    </div>
  </header>
</template>
