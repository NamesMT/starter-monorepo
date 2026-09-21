<!-- Credit @archisvaze -->

<template>
  <div class="names-liquid-glass-div">
    <slot />
  </div>
</template>

<style>
:root {
  /* Inner shadow */
  --shadow-offset: 0;
  --shadow-blur: 10px;
  --shadow-spread: -7px;
  --shadow-color: rgba(255, 255, 255, 0.7);

  /* Painted glass */
  --tint-color: 255, 255, 255;
  --tint-opacity: 0.04;

  /* Background frost */
  --frost-blur: 2px;

  --outer-shadow-blur: 20px;
}

.names-liquid-glass-div {
  position: relative;
  border-radius: var(--c-radius);
  isolation: isolate;
  box-shadow: 0px 6px var(--outer-shadow-blur) rgba(0, 0, 0, 0.2);
}

.names-liquid-glass-div::before {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: var(--c-radius);
  box-shadow:
    inset var(--shadow-offset) var(--shadow-offset) var(--shadow-blur) var(--shadow-spread) var(--shadow-color);
  background-color: rgba(var(--tint-color), var(--tint-opacity));
}

.names-liquid-glass-div::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: var(--c-radius);
  backdrop-filter: blur(var(--frost-blur));
  filter: url(#glass-distortion);
  isolation: isolate;
  -webkit-backdrop-filter: blur(var(--frost-blur));
  -webkit-filter: url("#glass-distortion");
}
</style>
