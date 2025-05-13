<script setup lang="ts">
import GridMaker from '@local/common-vue/src/components/GridMaker.vue'
import { Carousel, CarouselContent, CarouselNext, CarouselPrevious } from '@/lib/components/ui/carousel'

definePageMeta({
  title: 'pages.title.home',
})

const { locale, setLocale } = useI18n()
const runtimeConfig = useRuntimeConfig()
const colorMode = useColorMode()
const { $apiClient, $auth } = useNuxtApp()

const number = ref()

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
  <div class="min-h-screen flex flex-col items-center justify-center gap-4 px-4 py-4 text-center">
    <div class="flex items-end gap-2">
      <GridMaker
        :value="[
          '* *',
          '***',
          '* *',
        ]"
      />
      <GridMaker
        class="[&_.GridMaker\_\_col]:nth-[1]:[&_.GridMaker\_\_row]:rounded-full"
        :value="[
          '*',
          '*',
          '*',
          '*',
        ]"
      />
    </div>

    <div class="w-full flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
      <div class="flex items-center gap-2">
        <p>
          Theme:
        </p>
        <ClientOnly>
          <template #fallback>
            <Button
              key="fallback"
              label="..."
            />
          </template>

          <Button
            :label="colorMode.preference"
            @pointerdown="colorMode.preference = (colorMode.preference !== 'dark')
              ? 'dark'
              : 'light'"
          />
        </ClientOnly>
      </div>

      <div class="flex items-center gap-2">
        <p>{{ $t('language') }}:</p>
        <Button
          :label="locale"
          @pointerdown="setLocale(locale === 'en' ? 'vi' : 'en')"
        />
      </div>

      <div :key="$li18n.renderKey">
        {{ dayjs().format('dddd') }}
      </div>

      <InputNumber
        v-model="number"
        input-id="integeronly"
        :placeholder="$t('number-input')"
      />
    </div>

    <div class="max-w-full flex flex-col items-center">
      <div class="max-w-full overflow-x-auto">
        <span>Configured</span> <code>frontendUrl</code>: <code>{{ runtimeConfig.public.frontendUrl }}</code>
      </div>
      <div class="max-w-full overflow-x-auto">
        <span>Configured</span> <code>backendUrl</code>: <code>{{ runtimeConfig.public.backendUrl }}</code>
      </div>
      <div>API Response from `<code>{{ $apiClient.api.dummy.hello.$url() }}</code>`:</div>
      <pre class="max-w-full w-fit overflow-x-auto rounded bg-black p-2 px-4 text-left text-white">{{ apiError || apiResult || 'Empty' }}</pre>
    </div>

    <div class="max-w-full flex flex-col items-center">
      <div>Tanstack Query result (fetched client-side and persisted to IndexedDB for 12 hours)</div>
      <pre class="max-w-full w-fit overflow-x-auto rounded bg-black p-2 px-4 text-left text-white">{{ isPending ? 'Loading...' : isError ? error : data }}</pre>
      <Button
        class="mt-2"
        label="Make stale (refetch)"
        @pointerdown="queryClient.invalidateQueries({ queryKey: ['hello_test'] })"
      />
    </div>

    <div class="max-w-full">
      <ClientOnly>
        <template #fallback>
          <div key="fallback" class="h-12 flex items-center">
            <p>Auth status: ...</p>
          </div>
        </template>

        <div class="h-12 flex items-center justify-center gap-4">
          <p>Auth status: {{ $auth.loggedIn ? 'Logged in' : 'Not logged in' }}</p>
          <div class="flex items-center justify-center gap-2">
            <Button v-if="$auth.loggedIn" label="Sign-out" @click="navigateTo(getSignOutUrl(), { external: true })" />
            <Button v-else label="Sign-in" @click="navigateTo(getSignInUrl(), { external: true })" />
          </div>
        </div>

        <div v-if="$auth.loggedIn">
          <div>User information:</div>
          <pre class="max-w-full overflow-x-auto rounded bg-black p-2 px-4 text-left text-white 2xl:max-w-60vw">{{ $auth }}</pre>
        </div>
      </ClientOnly>
    </div>

    <div class="max-w-full w-full flex justify-center px-12">
      <Carousel class="relative max-w-xs w-full">
        <CarouselContent>
          <!-- You could either explicitly import the shadcn components or use them with 'Shad' auto-import prefix -->
          <ShadCarouselItem v-for="(_, index) in 5" :key="index">
            <div class="p-1">
              <Card>
                <template #title>
                  Simple Card #{{ index }}
                </template>
                <template #content>
                  <p class="m-0">
                    Lorem ipsum dolor sit amet, consectetur adipisicing elit. Inventore sed consequuntur error repudiandae numquam deserunt quisquam repellat libero asperiores earum nam nobis, culpa ratione quam perferendis esse, cupiditate neque
                    quas!
                  </p>
                </template>
              </Card>
            </div>
          </ShadCarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>

    <div>
      <IsSST />
    </div>
  </div>
</template>
