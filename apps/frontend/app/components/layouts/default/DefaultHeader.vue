<script setup lang="ts">
import type { ConvexVueContext } from 'convex-vue'

// const theme = useTheme()
const convexVueContext = inject<ConvexVueContext>('convex-vue')
</script>

<template>
  <header class="text-xl grid grid-cols-12 h-73px items-center view-transition-header xl:gap-10">
    <div class="text-xl py-4 flex gap-2 col-span-3 h-full items-center justify-start">
      <NuxtLink to="https://github.com/NamesMT/starter-monorepo" external target="_blank" class="text-2xl font-black flex gap-3 h-full items-center">
        <Logo class="text-surface-900 h-full dark:text-surface-0" />
        <h1 class="whitespace-nowrap max-sm:hidden">
          starter-monorepo
        </h1>
      </NuxtLink>
    </div>

    <div
      class="text-surface-700 font-medium py-2.5 flex flex-row gap-2 col-span-6 justify-center dark:text-surface-300 [&>*]:(px-2) 2xl:gap-8 lg:gap-5 md:gap-4 sm:gap-3 xl:gap-6"
    >
      <NuxtLink
        to="/" class="group flex items-center"
        exact-active-class="text-secondary border-b-2px border-secondary"
      >
        <span class="transition-all group-hover:text-2xl group-hover:text-accent-foreground">{{ $t('pages.home.title') }}</span>
      </NuxtLink>
      <NuxtLink
        to="/test" class="group flex items-center"
        exact-active-class="text-secondary border-b-2px border-secondary"
      >
        <span class="transition-all group-hover:text-2xl group-hover:text-accent-foreground">{{ $t('pages.test.title') }}</span>
      </NuxtLink>
      <NuxtLink
        v-if="convexVueContext?.clientRef?.value"
        to="/chat" class="group flex items-center"
        exact-active-class="text-secondary border-b-2px border-secondary"
      >
        <span class="transition-all group-hover:text-2xl group-hover:text-accent-foreground">{{ $t('pages.chat.title') }}</span>
      </NuxtLink>
    </div>

    <div class="flex col-span-3">
      <div class="flex grow gap-4 items-center justify-end">
        <LanguageDropdown />
      </div>
    </div>
  </header>
</template>
