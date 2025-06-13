<script setup lang="ts">
// const theme = useTheme()
</script>

<template>
  <header class="grid grid-cols-12 h-73px items-center border-b bg-surface-100 px-2 transition-background-color view-transition-header xl:gap-10 dark:bg-surface-800 lg:px-8 md:px-6 sm:px-4">
    <div class="col-span-3 h-full flex items-center justify-start gap-2 py-4 text-xl">
      <NuxtLink to="/" class="h-full">
        <Logo class="h-full text-surface-900 dark:text-surface-0" />
      </NuxtLink>
    </div>

    <div
      class="divide-primary-2 text-body-2 col-span-6 h-full flex flex-row justify-center gap-2 text-surface-700 font-medium 2xl:gap-10 lg:gap-6 md:gap-5 sm:gap-4 xl:gap-7 [&>*]:(px-4 md:px-6 xl:px-8) dark:text-surface-300"
    >
      <NuxtLink
        to="/" class="group flex items-center"
        exact-active-class="text-accent-foreground font-semibold border-t-2px border-primary bg-gradient-to-b from-primary/20"
      >
        <span class="group-hover:text-mainGradient">{{ $t('pages.home.title') }}</span>
      </NuxtLink>

      <NuxtLink
        to="/test" class="group flex items-center"
        active-class="text-accent-foreground font-semibold border-t-2px border-primary bg-gradient-to-b from-primary/20"
      >
        <span class="group-hover:text-primary">{{ $t('pages.test.title') }}</span>
      </NuxtLink>

      <NuxtLink
        to="/chat" class="group flex items-center"
        active-class="text-accent-foreground font-semibold border-t-2px border-primary bg-gradient-to-b from-primary/20"
      >
        <span class="group-hover:text-primary">{{ $t('pages.chat.title') }}</span>
      </NuxtLink>
    </div>

    <div class="col-span-3 flex">
      <div class="flex grow items-center justify-end gap-5" />
    </div>
  </header>
</template>
