<script setup lang="ts">
import GridMaker from '@local/common-vue/src/components/GridMaker.vue'

definePageMeta({
  title: 'pages.home.title',
})

const { locale, locales, setLocale } = useI18n()
const runtimeConfig = useRuntimeConfig()
const colorMode = useColorMode()
const { $apiClient, $auth } = useNuxtApp()

const computedNextLocale = computed(() => {
  const currentLocaleIndex = locales.value.findIndex(lO => lO.code === locale.value)
  return locales.value[(currentLocaleIndex + 1) % locales.value.length]!.code
})

// API
const { data: apiResult, error: apiError } = await useLazyAsyncData(
  'apiResult',
  () => hcParse($apiClient.api.dummy.hello.$get()),
  {
    server: false,
    default: () => 'Loading...' as const,
  },
)

// Tanstack Query
const queryClient = useQueryClient()
const { isPending, isError, data, error } = useQuery({
  queryKey: ['hello_test'],
  queryFn: () => hcParse($apiClient.api.dummy.hello.$get()),
})
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center gap-6 px-4 py-8 text-center">
    <!-- GridMaker Section -->
    <div class="max-w-2xl w-full border rounded-lg p-4 shadow">
      <h2 class="mb-3 text-xl font-semibold">
        {{ $t('pages.home.section.gridMaker.title') }}
      </h2>
      <div class="flex items-end gap-4 sm:flex-row sm:justify-center">
        <GridMaker
          :value="[
            '* *',
            '***',
            '* *',
          ]"
        />
        <GridMaker
          class="[&_.GridMaker\_\_col]:nth-[1]:[&_.GridMaker\_\_row]:rounded-full" :value="[
            '*',
            '*',
            '*',
            '*',
          ]"
        />
      </div>
    </div>

    <!-- Controls Section -->
    <div class="max-w-2xl w-full border rounded-lg p-4 shadow">
      <h2 class="mb-3 text-xl font-semibold">
        {{ $t('pages.home.section.controls.title') }}
      </h2>
      <div class="flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
        <div class="flex items-center gap-2">
          <p>{{ $t('pages.home.themeSwitcher.label') }}:</p>
          <ClientOnly>
            <template #fallback>
              <Button>...</Button>
            </template>
            <Button @pointerdown="colorMode.preference = (colorMode.value !== 'dark') ? 'dark' : 'light'">
              {{ colorMode.preference }}
            </Button>
          </ClientOnly>
        </div>

        <div class="flex items-center gap-2">
          <p>{{ $t('language') }}:</p>
          <Button @pointerdown="setLocale(computedNextLocale)">
            {{ locale.substring(0, 2) }}
          </Button>
        </div>

        <div class="flex items-center gap-2">
          <p>{{ $t('pages.home.dateDisplay.label') }}:</p>
          <span :key="$li18n.renderKey" class="font-semibold">{{ dayjs().format('dddd') }}</span>
        </div>
      </div>
    </div>

    <!-- API and Config Info Section -->
    <div class="max-w-2xl w-full border rounded-lg p-4 text-sm shadow">
      <h2 class="mb-3 text-xl font-semibold">
        {{ $t('pages.home.section.apiInfo.title') }}
      </h2>
      <div class="flex flex-col items-start gap-2">
        <div class="max-w-full overflow-x-auto">
          <span class="font-medium">{{ $t('pages.home.runtimeConfig.frontendUrl') }}:</span> <code
            class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800"
          >{{ runtimeConfig.public.frontendUrl }}</code>
        </div>
        <div class="max-w-full overflow-x-auto">
          <span class="font-medium">{{ $t('pages.home.runtimeConfig.backendUrl') }}:</span> <code
            class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800"
          >{{ runtimeConfig.public.backendUrl }}</code>
        </div>
        <div class="max-w-full overflow-x-auto">
          <span class="font-medium">{{ $t('pages.home.apiResponse.label') }}</span> <code
            class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800"
          >{{ $apiClient.api.dummy.hello.$url() }}</code>:
        </div>
        <pre class="max-w-full w-full overflow-x-auto rounded bg-black p-2 px-4 text-left text-xs text-white">{{ apiError
          || apiResult || $t('pages.home.apiResponse.empty') }}</pre>
      </div>
    </div>

    <!-- Tanstack Query Section -->
    <div class="max-w-2xl w-full border rounded-lg p-4 shadow">
      <h2 class="mb-1 text-xl font-semibold">
        {{ $t('pages.home.section.tanstackQuery.title') }}
      </h2>
      <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
        {{ $t('pages.home.section.tanstackQuery.description') }}
      </p>
      <div class="flex flex-col items-center gap-3">
        <pre class="max-w-full w-full overflow-x-auto rounded bg-black p-2 px-4 text-left text-xs text-white">{{ isPending
          ? $t('pages.home.tanstackQuery.loading') : isError ? error : data }}</pre>
        <Button @pointerdown="queryClient.invalidateQueries({ queryKey: ['hello_test'] })">
          {{ $t('pages.home.tanstackQuery.staleButton') }}
        </Button>
      </div>
    </div>

    <!-- Auth Section -->
    <div class="max-w-2xl w-full border rounded-lg p-4 shadow">
      <h2 class="mb-3 text-xl font-semibold">
        {{ $t('pages.home.section.auth.title') }}
      </h2>
      <ClientOnly>
        <template #fallback>
          <div class="h-12 flex items-center justify-center">
            <p>{{ $t('pages.home.auth.status.loading') }}</p>
          </div>
        </template>
        <div class="flex flex-col items-center gap-4">
          <p>
            {{ $t('pages.home.auth.status.label') }}: {{ $auth.loggedIn ? $t('pages.home.auth.status.loggedIn')
              : $t('pages.home.auth.status.notLoggedIn') }}
          </p>
          <div class="flex items-center justify-center gap-2">
            <Button v-if="$auth.loggedIn" @click="navigateTo(getSignOutUrl(), { external: true })">
              {{
                $t('pages.home.auth.signOutButton') }}
            </Button>
            <Button v-else @click="navigateTo(getSignInUrl(), { external: true })">
              {{ $t('pages.home.auth.signInButton')
              }}
            </Button>
          </div>
          <div v-if="$auth.loggedIn" class="mt-2 w-full text-left">
            <p class="mb-1 text-sm font-medium">
              {{ $t('pages.home.auth.userInfo.title') }}:
            </p>
            <pre class="max-w-full w-full overflow-x-auto rounded bg-black p-2 px-4 text-left text-xs text-white">{{ $auth
            }}</pre>
          </div>
        </div>
      </ClientOnly>
    </div>

    <!-- Carousel Section -->
    <div class="max-w-2xl w-full border rounded-lg p-4 shadow">
      <h2 class="mb-3 text-xl font-semibold">
        {{ $t('pages.home.section.carousel.title') }}
      </h2>
      <div class="flex justify-center">
        <Carousel class="relative max-w-xs w-full">
          <CarouselContent>
            <CarouselItem v-for="(_, index) in 5" :key="index">
              <div class="p-1">
                <Card>
                  <CardContent class="aspect-square flex flex-col justify-center p-6">
                    <h4 class="text-4xl font-semibold">
                      {{ $t('pages.home.carousel.cardTitle', { index: index + 1 }) }}
                    </h4>
                    <p class="m-0 text-sm">
                      {{ $t('pages.home.carousel.cardContent') }}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  </div>
</template>
