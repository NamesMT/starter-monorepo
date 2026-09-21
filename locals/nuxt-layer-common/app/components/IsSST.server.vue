<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
</script>

<template>
  <div>Is running devSST: {{ String(runtimeConfig.isSst) }}</div>
</template>
