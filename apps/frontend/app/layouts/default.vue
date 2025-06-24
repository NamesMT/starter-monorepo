<script setup>
const route = useRoute()
const { t } = useI18n()
const head = useLocaleHead({
  key: 'id',
})
const title = computed(() => route.meta.title && t(route.meta.title))

const windowsScroll = useWindowScroll()
useEventListener('resize', () => { windowsScroll.measure() })
watch(() => route.name, () => { windowsScroll.measure() })
</script>

<template>
  <div>
    <Html :lang="head.htmlAttrs.lang" :dir="head.htmlAttrs.dir" class="font-sans">
      <Head>
        <Title>{{ title }}</Title>
        <template v-for="link in head.link" :key="link.id">
          <Link :id="link.id" :rel="link.rel" :href="link.href" :hreflang="link.hreflang" />
        </template>
        <template v-for="meta in head.meta" :key="meta.id">
          <Meta :id="meta.id" :property="meta.property" :content="meta.content" />
        </template>
      </Head>

      <Body>
        <div class="w-full flex flex-col min-h-dvh">
          <!-- Header -->
          <DefaultHeader
            v-motion-slide-visible-once-left
            class="fixed w-full transition-top"
            :class="windowsScroll.arrivedState.top ? 'top-0' : '-top-20'"
          />

          <!-- NuxtPage -->
          <div id="app-body" class="flex grow px-5 py-15 pt-20 2xl:px-20 lg:px-10 xl:px-15">
            <slot />
          </div>

          <!-- Footer -->
          <DefaultFooter
            class="fixed w-full transition-bottom"
            :class="windowsScroll.arrivedState.bottom ? 'bottom-0' : '-bottom-20'"
          />
        </div>
      </Body>
    </Html>
  </div>
</template>
