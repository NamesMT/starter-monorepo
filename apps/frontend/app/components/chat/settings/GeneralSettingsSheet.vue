<script setup lang="ts">
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/lib/shadcn/components/ui/sheet'
import { useChatGlobalsContext } from '~/components/chat/ChatGlobalsProvider.vue'
import Input from '~/lib/shadcn/components/ui/input/Input.vue'
import { useSidebar } from '~/lib/shadcn/components/ui/sidebar'
import Switch from '~/lib/shadcn/components/ui/switch/Switch.vue'

const { $auth } = useNuxtApp()
const sidebarContext = useSidebar()
const { agentsSettings } = useChatContext()
const { generalSettingsOpen } = useChatGlobalsContext()
const { locale, locales, setLocale } = useI18n()
const computedNextLocale = computed(() => {
  const currentLocaleIndex = locales.value.findIndex(lO => lO.code === locale.value)
  return locales.value[(currentLocaleIndex + 1) % locales.value.length]!.code
})

// Providers that are supported through `Common` interface
const supportedProvidersCommon = ['openrouter', 'openai', 'google', 'anthropic', 'groq'] as const

// Bootstraping object data for the supported providers
for (const provider of supportedProvidersCommon) {
  if (!agentsSettings.value.providers[provider]) {
    agentsSettings.value.providers[provider] = {
      enabled: false,
      apiKey: '',
      models: {
      },
    }
  }
}

const nicknameRef = useChatNickname()

const [DefineKbd, ReuseKbd] = createReusableTemplate()
const [DefineShortcutLi, ReuseShortcutLi] = createReusableTemplate<{ title: string, keys: string[] }>()
</script>

<template>
  <Sheet v-model:open="generalSettingsOpen">
    <SheetContent :side="sidebarContext.isMobile.value ? 'top' : 'right'" class="flex flex-col">
      <SheetHeader>
        <SheetTitle>{{ $t('chat.settings.general.title') }}</SheetTitle>
      </SheetHeader>

      <div class="flex grow flex-col gap-4">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex gap-2 items-center">
              <Button class="w-fit uppercase" variant="outline" @pointerdown="setLocale(computedNextLocale)">
                <div class="text-mainGradient flex items-center">
                  <div class="i-hugeicons:translate bg-mainGradient" />: <p class="ml-1">
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

          <div class="flex gap-2 items-center">
            <div class="shrink-0">
              {{ $t('nickname') }}:
            </div>
            <Input
              v-model="nicknameRef"
              :placeholder="$auth.loggedIn ? $auth.user.fullName : 'Anonymous'"
              type="text"
              class="px-2 py-1 h-9"
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
            v-for="[provider, setting] of supportedProvidersCommon.map((p) => [p, agentsSettings.providers[p]!] as const)"
            :key="provider"
            class="flex gap-2 items-center justify-between"
          >
            <div class="shrink-0">
              {{ $t(`chat.provider.${provider}`) }}
            </div>

            <div class="flex gap-2 items-center">
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

      <SheetFooter>
        <div class="text-sm p-4 rounded-md bg-primary-50 flex flex-col gap-3 w-full dark:bg-primary-950">
          <!-- Define locally reusable components -->
          <div class="hidden">
            <DefineKbd v-slot="{ k }">
              <kbd class="text-sm font-sans px-2 py-1 rounded bg-background">{{ k }}</kbd>
            </DefineKbd>

            <DefineShortcutLi v-slot="{ title, keys }">
              <li class="flex items-center justify-between">
                <div>{{ title }}</div>
                <div class="flex gap-1">
                  <ReuseKbd v-for="k, index of keys" :key="index" :k />
                </div>
              </li>
            </DefineShortcutLi>
          </div>

          <h4 class="font-semibold">
            {{ $t('keyboard-shortcuts') }}
          </h4>

          <hr>

          <ul class="flex flex-col gap-4">
            <ReuseShortcutLi
              v-bind="{
                title: $t('chat.settings.general.shortcuts.search'),
                keys: ['Ctrl', 'K'],
              }"
            />
            <ReuseShortcutLi
              v-bind="{
                title: $t('chat.settings.general.shortcuts.newChat'),
                keys: ['Ctrl', 'Shift', 'O'],
              }"
            />
            <ReuseShortcutLi
              v-bind="{
                title: $t('chat.settings.general.shortcuts.toggleSidebar'),
                keys: ['Ctrl', 'B'],
              }"
            />
            <ReuseShortcutLi
              v-bind="{
                title: $t('chat.settings.general.shortcuts.toggleSettings'),
                keys: ['Ctrl', 'G'],
              }"
            />
          </ul>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
