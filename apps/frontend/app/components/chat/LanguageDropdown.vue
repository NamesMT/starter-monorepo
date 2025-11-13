<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()
</script>

<template>
  <DropdownMenu :modal="true">
    <DropdownMenuTrigger>
      <Button
        class="font-medium px-2 py-1 h-fit w-11.5 uppercase text-xl!"
        variant="ghost"
      >
        {{ locale.substring(0, 2) }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem
        v-for="l of locales" :key="l.code"
        class="font-medium uppercase"
        @click="setLocale(l.code)"
      >
        {{ l.code }} ({{ l.name }})
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
