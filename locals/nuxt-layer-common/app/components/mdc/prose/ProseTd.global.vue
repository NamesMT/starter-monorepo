<template>
  <td class="prose-td">
    <slot />
  </td>
</template>

<style scoped>
.prose-td {
  border: 1px solid var(--mdc-border);
  text-align: left;
  padding: 0.5rem 1rem;
}

.prose-td[align='center'] {
  text-align: center;
}

.prose-td[align='right'] {
  text-align: right;
}
</style>
