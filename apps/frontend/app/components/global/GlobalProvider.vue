<script setup lang="ts">
</script>

<template>
  <div>
    <TooltipProvider :delay-duration="500">
      <NuxtRouteAnnouncer />
      <!-- LoadingIndicator is bugged for some reason -->
      <!-- <NuxtLoadingIndicator /> -->
      <GlobalRegister />
      <slot />
    </TooltipProvider>
  </div>
</template>
