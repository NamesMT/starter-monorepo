<template>
  <code class="prose-inline-code">
    <slot />
  </code>
</template>

<style scoped>
.prose-inline-code {
  font-size: 0.875em;
  font-weight: 600;
  color: var(--mdc-inline-code);
  border: 1px solid var(--mdc-border);
  position: relative;
  border-radius: 4px;
  background-color: var(--mdc-muted);
  padding: 3px 5px;
  font-family: var(--mdc-code-family);
}

a .prose-inline-code {
  border: 1px dashed var(--mdc-muted-foreground);
}

a .prose-inline-code:hover {
  color: var(--mdc-active-link);
}
</style>
