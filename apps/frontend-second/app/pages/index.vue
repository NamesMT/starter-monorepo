<script setup lang="ts">
definePageMeta({
  title: 'pages.home.title',
})

// Composables, utils and the UI kit below are auto-imported from the shared layer.
const siteConfig = useSiteConfig()
const nickname = useLocalState<string>('frontend-second/nickname', () => '')
const currentTime = useHHMMSSFormat(new Date())
const placeholder = getRandomThoughtPlaceholder()
</script>

<template>
  <div class="mx-auto px-5 py-10 flex flex-col gap-6 max-w-3xl w-full">
    <SecondHero
      :title="$ts('hello')"
      :subtitle="siteConfig.description"
    >
      <p class="text-sm mt-4">
        {{ $t('pages.home.dateDisplay.label') }}: <strong>{{ currentTime }}</strong>
      </p>
    </SecondHero>

    <Card>
      <CardHeader>
        <CardTitle>Shared layer UI kit</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <Input v-model="nickname" :placeholder="placeholder" />

        <div class="flex flex-wrap gap-2">
          <Button>{{ $t('confirm') }}</Button>
          <Button variant="secondary">
            {{ $t('cancel') }}
          </Button>
          <Button variant="outline">
            {{ $t('continue') }}
          </Button>
        </div>

        <Separator />

        <p class="text-sm">
          <span class="text-surface-500">{{ $t('nickname') }}:</span>
          <span v-if="nickname"> {{ nickname }}</span>
          <span v-else class="text-surface-400"> —</span>
        </p>

        <NuxtLink to="/showcase" class="text-sm text-primary-500 underline">
          {{ $t('pages.test.title') }} →
        </NuxtLink>
      </CardContent>
    </Card>
  </div>
</template>
