<!-- This file is similar to GlobalRegister.vue, but it is only used for local development purposes and type checking is disabled. -->
<script setup lang="ts">
// eslint-disable-next-line ts/ban-ts-comment
// @ts-nocheck

if (import.meta.env.DEV) {
  if (import.meta.client) {
    window.dayjs = dayjs
  }
}
</script>

<template>
  <div />
</template>
