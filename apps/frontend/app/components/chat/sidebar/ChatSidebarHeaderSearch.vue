<script setup lang="ts">
const searchInput = defineModel<string>({ required: true })
</script>

<template>
  <div class="px-2 py-1 border-b flex gap-2 items-center">
    <div class="i-hugeicons:bubble-chat-search shrink-0" />
    <input v-model="searchInput" type="text" :placeholder="$t('chat.sidebar.search.placeholder')" class="outline-none bg-transparent w-full">
    <Button v-show="searchInput" class="shrink-0 size-6" variant="ghost" size="icon" @click="searchInput = ''">
      <div class="i-hugeicons:cancel-01" />
    </Button>
  </div>
</template>
