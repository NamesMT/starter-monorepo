<script setup lang="ts">
const searchInput = defineModel<string>({ required: true })
</script>

<template>
  <div class="flex items-center gap-2 border-b px-2 py-1">
    <div class="i-hugeicons:bubble-chat-search shrink-0" />
    <input v-model="searchInput" type="text" placeholder="Search chats..." class="w-full bg-transparent outline-none">
    <Button v-show="searchInput" class="size-6 shrink-0" variant="ghost" size="icon" @click="searchInput = ''">
      <div class="i-hugeicons:cancel-01" />
    </Button>
  </div>
</template>
