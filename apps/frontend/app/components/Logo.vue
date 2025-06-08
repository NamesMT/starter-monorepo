<script setup lang="ts">
import LogoFull from '~~/public/logo-full.svg'
import LogoSimple from '~~/public/logo-simple.svg'

const {
  variant = 'simple',
} = defineProps<{
  variant?: 'simple' | 'full'
}>()
</script>

<template>
  <LogoFull v-if="variant === 'full'" />
  <LogoSimple v-else />
</template>
