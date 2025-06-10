<script setup lang="ts">
// const theme = useTheme()
</script>

<template>
  <header class="grid grid-cols-12 h-73px items-center border-b bg-gray-400 px-2 transition-background-color xl:gap-10 dark:bg-gray-600 lg:px-8 md:px-6 sm:px-4">
    <div class="col-span-3 h-full flex items-center justify-start gap-2 py-4 text-xl">
      <NuxtLink to="/" class="h-full">
        <Logo class="h-full text-black dark:text-white" />
      </NuxtLink>
    </div>

    <div
      class="divide-primary-2 text-body-2 col-span-6 h-full flex flex-row justify-center gap-2 text-gray-800 font-medium 2xl:gap-10 lg:gap-6 md:gap-5 sm:gap-4 xl:gap-7 [&>*]:(px-4 md:px-6 xl:px-8) dark:text-gray-200"
    >
      <NuxtLink
        to="/" class="group flex items-center"
        exact-active-class="text-white font-semibold border-t-2px border-primary-400 bg-gradient-to-b from-primary-400/20"
      >
        <span class="group-hover:text-mainGradient">{{ $t('pages.home.title') }}</span>
      </NuxtLink>

      <NuxtLink
        to="/test" class="group flex items-center"
        active-class="text-white font-semibold border-t-2px border-primary-400 bg-gradient-to-b from-primary-400/20"
      >
        <span class="group-hover:text-mainGradient">{{ $t('pages.test.title') }}</span>
      </NuxtLink>
    </div>

    <div class="col-span-3 flex">
      <div class="flex grow items-center justify-end gap-5">
        <Avatar label="MT" size="large" shape="circle" />
      </div>
    </div>
  </header>
</template>
