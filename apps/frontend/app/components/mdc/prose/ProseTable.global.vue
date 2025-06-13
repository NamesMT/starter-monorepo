<template>
  <div class="table-wrapper">
    <table class="prose-table">
      <slot />
    </table>
  </div>
</template>

<style scoped>
.table-wrapper {
  width: 100%;
  overflow-y: auto;
  margin: 1em 0;
}

.prose-table {
  width: 100%;
  margin: 0;
  border-radius: 0.5rem;
  border-spacing: 0;
  text-indent: 0;
  border-color: inherit;
  border-collapse: collapse;
}
</style>

<style>
*,
*::before,
*::after {
  border: 0px solid var(--mdc-border);
}
</style>
