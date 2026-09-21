<template>
  <ul class="prose-ul">
    <slot />
  </ul>
</template>

<style scoped>
.prose-ul {
  list-style-type: disc;
  margin: 1em 0;
  line-height: 1.75;
  padding-left: 1.25em;
}

.prose-ul.contains-task-list {
  list-style-type: none;
  margin: 0.5rem 0;
}
</style>
