<script setup>
const route = useRoute()
const { t } = useI18n()
const localeHead = useLocaleHead()

const title = computed(() => route.meta.title ? t(route.meta.title) : undefined)

useHead(() => ({
  htmlAttrs: { ...localeHead.value.htmlAttrs, class: 'font-sans' },
  title: title.value,
  link: localeHead.value.link,
  meta: localeHead.value.meta,
}))
</script>

<template>
  <div>
    <div class="flex flex-col w-full min-h-dvh">
      <!-- NuxtPage -->
      <div id="app-body" class="flex grow">
        <slot />
      </div>
    </div>
  </div>
</template>
