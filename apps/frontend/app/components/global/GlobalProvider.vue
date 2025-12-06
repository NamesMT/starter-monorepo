<script setup lang="ts">
</script>

<template>
  <div>
    <TooltipProvider :delay-duration="500">
      <NuxtRouteAnnouncer />
      <NuxtLoadingIndicator />
      <GlobalRegister />
      <slot />
    </TooltipProvider>
  </div>
</template>
