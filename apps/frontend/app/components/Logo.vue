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
  <LogoFull v-if="variant === 'full'" class="site-logo site-logo--full" />
  <LogoSimple v-else class="site-logo site-logo--simple" />
</template>
