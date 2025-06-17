<script setup lang="ts">
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/lib/shadcn/components/ui/sheet'
import Input from '~/lib/shadcn/components/ui/input/Input.vue'
import { useSidebar } from '~/lib/shadcn/components/ui/sidebar'
import Switch from '~/lib/shadcn/components/ui/switch/Switch.vue'

const { $auth } = useNuxtApp()
const sidebarContext = useSidebar()
const { agentsSetting } = useChatContext()
const { locale, locales, setLocale } = useI18n()
const computedNextLocale = computed(() => {
  const currentLocaleIndex = locales.value.findIndex(lO => lO.code === locale.value)
  return locales.value[(currentLocaleIndex + 1) % locales.value.length]!.code
})

// Providers that are supported through `Common` interface
const supportedProvidersCommon = ['openrouter', 'openai'] as const

// Bootstraping object data for the supported providers
for (const provider of supportedProvidersCommon) {
  if (!agentsSetting.value.providers[provider]) {
    agentsSetting.value.providers[provider] = {
      enabled: false,
      apiKey: '',
      models: {
      },
    }
  }
}

const nicknameRef = useChatNickname()
</script>

<template>
  <Sheet>
    <SheetTrigger as-child>
      <slot />
    </SheetTrigger>
    <SheetContent :side="sidebarContext.isMobile.value ? 'top' : 'right'" class="flex flex-col">
      <SheetHeader>
        <SheetTitle>{{ $t('chat.settings.general.title') }}</SheetTitle>
      </SheetHeader>

      <div class="flex grow flex-col gap-4">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Button class="w-fit uppercase" variant="outline" @pointerdown="setLocale(computedNextLocale)">
                <div class="flex items-center text-mainGradient">
                  <div i-hugeicons:translate class="bg-mainGradient" />: <p class="ml-1">
                    {{ locale.substring(0, 2) }}
                  </p>
                </div>
              </Button>
            </div>
            <div>
              <Button v-if="$auth.loggedIn" @click="navigateTo(getSignOutUrl(), { external: true })">
                {{
                  $t('pages.home.auth.signOutButton') }}
              </Button>
              <Button v-else @click="navigateTo(getSignInUrl(), { external: true })">
                {{ $t('pages.home.auth.signInButton')
                }}
              </Button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <div class="shrink-0">
              {{ $t('nickname') }}:
            </div>
            <Input
              v-model="nicknameRef"
              :placeholder="$auth.loggedIn ? $auth.user.name : 'Anonymous'"
              type="text"
              class="h-9 px-2 py-1"
              @update:model-value="nicknameRef = nicknameRef.trim()"
            />
          </div>
        </div>

        <hr>

        <div>
          <SheetHeader class="mb-4">
            <SheetTitle class="text-base">
              {{ $t('chat.settings.providers.title') }}
            </SheetTitle>
          </SheetHeader>

          <div
            v-for="[provider, setting] of supportedProvidersCommon.map((p) => [p, agentsSetting.providers[p]!] as const)"
            :key="provider"
            class="flex items-center justify-between gap-2"
          >
            <div class="shrink-0">
              {{ $t(`chat.provider.${provider}`) }}
            </div>

            <div class="flex items-center gap-2">
              <Switch v-model="setting.enabled" :disabled="!Object.keys(setting.models).length">
                <template #thumb>
                  <div class="i-hugeicons:zap" />
                </template>
              </Switch>
              <ProviderSettingsDialog :name="provider" :settings="setting">
                <Button variant="ghost" size="icon" class="group hover:bg-muted">
                  <div class="i-hugeicons:configuration-01 size-6 group-hover:bg-mainGradient" />
                </Button>
              </ProviderSettingsDialog>
            </div>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
