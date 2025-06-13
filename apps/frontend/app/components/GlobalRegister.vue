<script setup lang="ts">
</script>

<template>
  <!-- Register global Shadcn components -->
  <div>
    <ClientOnly>
      <Toaster />
    </ClientOnly>
  </div>

  <!-- Liquid glass SVG filter -->
  <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute; overflow:hidden">
    <defs>
      <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
        <feDisplacementMap in="SourceGraphic" in2="blurred" scale="66" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>

  <DevRegister />
</template>
