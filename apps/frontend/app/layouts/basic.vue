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
          <!-- NuxtPage -->
          <div id="app-body" class="flex grow">
            <slot />
          </div>
        </div>
      </Body>
    </Html>
  </div>
</template>
