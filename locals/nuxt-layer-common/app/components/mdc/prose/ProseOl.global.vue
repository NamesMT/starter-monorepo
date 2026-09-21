<template>
  <ol class="prose-ol">
    <slot />
  </ol>
</template>

<style scoped>
.prose-ol {
  list-style-type: decimal;
  margin: 1em 0;
  line-height: 1.75;
  padding-left: 1.25em;
}
</style>
