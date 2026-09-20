<script setup lang="ts">
const route = useRoute()
const { ts } = useI18n()

const title = computed(() => route.meta.title ? ts(route.meta.title as string) : undefined)

useHead(() => ({
  htmlAttrs: { class: 'font-sans' },
  title: title.value,
}))

const windowsScroll = useWindowScroll()
useEventListener('resize', () => { windowsScroll.measure() })
watch(() => route.name, () => { windowsScroll.measure() })
</script>

<template>
  <div>
    <div class="flex flex-col w-full min-h-dvh">
      <!-- Header -->
      <div
        v-motion-slide-visible-once-left
        class="pr-[--scrollbar-width] w-full transition-top fixed"
        :class="windowsScroll.arrivedState.top ? 'top-0' : '-top-20'"
      >
        <DefaultHeader class="px-5 2xl:px-20 lg:px-10 xl:px-15" />
      </div>

      <!-- NuxtPage -->
      <div id="app-body" class="px-5 py-15 pt-20 flex grow 2xl:px-20 lg:px-10 xl:px-15">
        <slot />
      </div>

      <!-- Footer -->
      <DefaultFooter
        class="w-full transition-bottom fixed"
        :class="windowsScroll.arrivedState.bottom ? 'bottom-0' : '-bottom-20'"
      />
    </div>
  </div>
</template>
