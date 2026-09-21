<template>
  <blockquote class="prose-blockquote">
    <slot />
  </blockquote>
</template>

<style scoped>
.prose-blockquote {
  border-left: 0.25em solid var(--mdc-border);
  font-style: italic;
  padding-left: 1em;
  margin: 1em 0;
  overflow-x: auto;
}
</style>
