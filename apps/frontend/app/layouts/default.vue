<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const head = useLocaleHead({
})

const title = computed(() => route.meta.title && t(route.meta.title as string))

const windowsScroll = useWindowScroll()
useEventListener('resize', () => { windowsScroll.measure() })
watch(() => route.name, () => { windowsScroll.measure() })
</script>

<template>
  <div>
    <Html :lang="head.htmlAttrs.lang" :dir="head.htmlAttrs.dir" class="font-sans">
      <Head>
        <Title>
          {{ title }}
        </Title>
        <template v-for="link in head.link" :key="link.id">
          <Link :id="link.id" :rel="link.rel" :href="link.href" :hreflang="link.hreflang" />
        </template>
        <template v-for="meta in head.meta" :key="meta.id">
          <Meta :id="meta.id" :property="meta.property" :content="meta.content" />
        </template>
      </Head>

      <Body>
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
      </Body>
    </Html>
  </div>
</template>
