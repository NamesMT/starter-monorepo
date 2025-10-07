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
  <div class="text-center flex flex-col gap-6 w-full items-center justify-center">
    <!-- GridMaker Section -->
    <div class="p-4 border rounded-lg max-w-2xl w-full shadow">
      <h2 class="text-xl font-semibold mb-3">
        {{ $t('pages.home.section.gridMaker.title') }}
      </h2>
      <div class="flex gap-4 items-end sm:flex-row sm:justify-center">
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
    <div class="p-4 border rounded-lg max-w-2xl w-full shadow">
      <h2 class="text-xl font-semibold mb-3">
        {{ $t('pages.home.section.controls.title') }}
      </h2>
      <div class="flex flex-col gap-4 items-center justify-center sm:flex-row sm:flex-wrap">
        <div class="flex gap-2 items-center">
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

        <div class="flex gap-2 items-center">
          <p>{{ $t('language') }}:</p>
          <Button @pointerdown="setLocale(computedNextLocale)">
            {{ locale.substring(0, 2) }}
          </Button>
        </div>

        <div class="flex gap-2 items-center">
          <p>{{ $t('pages.home.dateDisplay.label') }}:</p>
          <span :key="$li18n.renderKey" class="font-semibold">{{ dayjs().format('dddd') }}</span>
          <!-- Note: You should use the newly added <NuxtTime/> component for day formatting btw, dayjs is kept here for demo reference -->
        </div>
      </div>
    </div>

    <!-- API and Config Info Section -->
    <div class="text-sm p-4 border rounded-lg max-w-2xl w-full shadow">
      <h2 class="text-xl font-semibold mb-3">
        {{ $t('pages.home.section.apiInfo.title') }}
      </h2>
      <div class="flex flex-col gap-2 items-start">
        <div class="max-w-full overflow-x-auto">
          <span class="font-medium">{{ $t('pages.home.runtimeConfig.frontendUrl') }}:</span> <code
            class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
          >{{ runtimeConfig.public.frontendUrl }}</code>
        </div>
        <div class="max-w-full overflow-x-auto">
          <span class="font-medium">{{ $t('pages.home.runtimeConfig.backendUrl') }}:</span> <code
            class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
          >{{ runtimeConfig.public.backendUrl }}</code>
        </div>
        <div class="max-w-full overflow-x-auto">
          <span class="font-medium">{{ $t('pages.home.apiResponse.label') }}</span> <code
            class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
          >{{ $apiClient.api.dummy.hello.$url() }}</code>:
        </div>
        <pre class="text-xs text-white p-2 px-4 text-left rounded bg-black max-w-full w-full overflow-x-auto">{{ apiError
          || apiResult || $t('pages.home.apiResponse.empty') }}</pre>
      </div>
    </div>

    <!-- Tanstack Query Section -->
    <div class="p-4 border rounded-lg max-w-2xl w-full shadow">
      <h2 class="text-xl font-semibold mb-1">
        {{ $t('pages.home.section.tanstackQuery.title') }}
      </h2>
      <p class="text-sm text-gray-600 mb-2 dark:text-gray-400">
        {{ $t('pages.home.section.tanstackQuery.description') }}
      </p>
      <div class="flex flex-col gap-3 items-center">
        <pre class="text-xs text-white p-2 px-4 text-left rounded bg-black max-w-full w-full overflow-x-auto">{{ isPending
          ? $t('pages.home.tanstackQuery.loading') : isError ? error : data }}</pre>
        <Button @pointerdown="queryClient.invalidateQueries({ queryKey: ['hello_test'] })">
          {{ $t('pages.home.tanstackQuery.staleButton') }}
        </Button>
      </div>
    </div>

    <!-- Auth Section -->
    <div class="p-4 border rounded-lg max-w-2xl w-full shadow">
      <h2 class="text-xl font-semibold mb-3">
        {{ $t('pages.home.section.auth.title') }}
      </h2>
      <ClientOnly>
        <template #fallback>
          <div class="flex h-12 items-center justify-center">
            <p>{{ $t('pages.home.auth.status.loading') }}</p>
          </div>
        </template>
        <div class="flex flex-col gap-4 items-center">
          <p>
            {{ $t('pages.home.auth.status.label') }}: {{ $auth.loggedIn ? $t('pages.home.auth.status.loggedIn')
              : $t('pages.home.auth.status.notLoggedIn') }}
          </p>
          <div class="flex gap-2 items-center justify-center">
            <Button v-if="$auth.loggedIn" @click="navigateTo(getSignOutUrl(), { external: true })">
              {{
                $t('pages.home.auth.signOutButton') }}
            </Button>
            <Button v-else @click="navigateTo(getSignInUrl(), { external: true })">
              {{ $t('pages.home.auth.signInButton')
              }}
            </Button>
          </div>
          <div v-if="$auth.loggedIn" class="mt-2 text-left w-full">
            <p class="text-sm font-medium mb-1">
              {{ $t('pages.home.auth.userInfo.title') }}:
            </p>
            <pre class="text-xs text-white p-2 px-4 text-left rounded bg-black max-w-full w-full overflow-x-auto">{{ $auth
            }}</pre>
          </div>
        </div>
      </ClientOnly>
    </div>

    <!-- Carousel Section -->
    <div class="p-4 border rounded-lg max-w-2xl w-full shadow">
      <h2 class="text-xl font-semibold mb-3">
        {{ $t('pages.home.section.carousel.title') }}
      </h2>
      <div class="flex justify-center">
        <Carousel class="max-w-xs w-full relative">
          <CarouselContent>
            <CarouselItem v-for="(_, index) in 5" :key="index">
              <div class="p-1">
                <Card>
                  <CardContent class="p-6 flex flex-col aspect-square justify-center">
                    <h4 class="text-4xl font-semibold">
                      {{ $t('pages.home.carousel.cardTitle', { index: index + 1 }) }}
                    </h4>
                    <p class="text-sm m-0">
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
