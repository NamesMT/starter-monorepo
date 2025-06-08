<script setup>
const route = useRoute()
const { t } = useI18n()
const head = useLocaleHead({
  key: 'id',
})
const title = computed(() => route.meta.title && t(route.meta.title))
</script>

<template>
  <div>
    <Html :lang="head.htmlAttrs.lang" :dir="head.htmlAttrs.dir" class="font-sans">
      <Head>
        <!-- Don't set Title tag if we doesn't have a title, this allows `Nuxt SEO`'s fallback title to be used -->
        <Title v-if="title">
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
        <div class="min-h-screen w-full flex flex-col">
          <!-- NuxtPage -->
          <div id="app-body" class="flex grow px-5 py-15 pt-20 2xl:px-20 lg:px-10 xl:px-15">
            <slot />
          </div>
        </div>
      </Body>
    </Html>
  </div>
</template>
