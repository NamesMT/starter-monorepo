<script setup lang="ts">
import type { CommonProviderAgentsSettings } from '@local/common/src/chat'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#layers/nuxt-layer-common/app/lib/shadcn/components/ui/dialog'
import { Input } from '#layers/nuxt-layer-common/app/lib/shadcn/components/ui/input'
import { Label } from '#layers/nuxt-layer-common/app/lib/shadcn/components/ui/label'
import Switch from '#layers/nuxt-layer-common/app/lib/shadcn/components/ui/switch/Switch.vue'
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from '#layers/nuxt-layer-common/app/lib/shadcn/components/ui/tags-input'
import { Textarea } from '#layers/nuxt-layer-common/app/lib/shadcn/components/ui/textarea'

type ModelSettings = CommonProviderAgentsSettings['models'][string]

const {
  name,
  settings,
} = defineProps<{
  name: string
  settings: CommonProviderAgentsSettings
}>()

/** Quick toggles that map to an entry in a model's `attachments` accept list. */
const ATTACHMENT_PRESETS = [
  { accept: 'image/*', key: 'image' },
  { accept: 'application/pdf', key: 'pdf' },
  { accept: 'text/*', key: 'text' },
  { accept: 'audio/*', key: 'audio' },
  { accept: 'video/*', key: 'video' },
] as const

// Normalize so the tags input always has an array to bind to.
for (const modelSettings of Object.values(settings.models))
  modelSettings.attachments ??= []

const newModelName = ref('')

function hasAccept(modelSettings: ModelSettings, accept: string) {
  return !!modelSettings.attachments?.includes(accept)
}

function toggleAccept(modelSettings: ModelSettings, accept: string) {
  const attachments = (modelSettings.attachments ??= [])
  const index = attachments.indexOf(accept)

  if (index === -1)
    attachments.push(accept)
  else
    attachments.splice(index, 1)
}

function setAccepts(modelSettings: ModelSettings, accepts: readonly unknown[] | undefined) {
  modelSettings.attachments = (accepts ?? []).map(value => String(value))
}

type GenerationKey = 'temperature' | 'topP' | 'maxOutputTokens'

function setGeneration(modelSettings: ModelSettings, key: GenerationKey, event: Event) {
  const raw = (event.target as HTMLInputElement).value.trim()

  if (!raw) {
    delete modelSettings[key]
    return
  }

  const value = Number(raw)
  if (Number.isFinite(value))
    modelSettings[key] = value
}

function setTraits(modelSettings: ModelSettings, value: string | number) {
  const traits = String(value)
  modelSettings.traits = traits.trim() ? traits : undefined
}

function toggleTools(modelSettings: ModelSettings) {
  modelSettings.tools = !modelSettings.tools
}

function addModel() {
  const model = newModelName.value.trim()
  if (!model || settings.models[model])
    return

  // eslint-disable-next-line vue/no-mutating-props
  settings.models[model] = { enabled: true, attachments: [] }
  newModelName.value = ''
}

function removeModel(model: string) {
  // eslint-disable-next-line vue/no-mutating-props
  delete settings.models[model]
}

function renameModel(oldModel: string, event: Event) {
  const input = event.target as HTMLInputElement
  const newModel = input.value.trim()

  if (!newModel || newModel === oldModel || settings.models[newModel]) {
    input.value = oldModel
    return
  }

  // eslint-disable-next-line vue/no-mutating-props
  settings.models[newModel] = settings.models[oldModel]!
  // eslint-disable-next-line vue/no-mutating-props
  delete settings.models[oldModel]
}
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent class="max-h-[85dvh] overflow-y-auto sm:max-w-[560px]">
      <DialogHeader>
        <DialogTitle>{{ $t(`chat.provider.${name}`) }}</DialogTitle>
        <DialogDescription>
          {{ $t('chat.settings.providerDialog.description') }}
        </DialogDescription>
      </DialogHeader>

      <div class="py-4 gap-5 grid">
        <div class="gap-1.5 grid items-center">
          <Label for="provider-settings-dialog_apiKey">{{ $t('chat.settings.providerDialog.form.apiKey') }}</Label>
          <!-- eslint-disable-next-line vue/no-mutating-props -->
          <Input id="provider-settings-dialog_apiKey" v-model="settings.apiKey" type="password" />
        </div>

        <div class="gap-3 grid">
          <div class="gap-1 grid">
            <Label>{{ $t('chat.settings.providerDialog.form.models') }}</Label>
            <p class="text-xs opacity-70">
              {{ $t('chat.settings.providerDialog.models.hint') }}
            </p>
          </div>

          <div
            v-for="(modelSettings, model) in settings.models"
            :key="model"
            class="p-3 border rounded-md flex flex-col gap-3"
          >
            <div class="flex gap-2 items-center">
              <Switch v-model="modelSettings.enabled" />

              <Input
                :model-value="model" class="text-xs font-mono flex-1 h-8"
                @change="renameModel(model, $event)"
              />

              <Button
                variant="ghost" size="icon" class="shrink-0 size-8 hover:text-destructive"
                :title="$t('chat.settings.providerDialog.model.remove')"
                @click="removeModel(model)"
              >
                <div class="i-hugeicons:delete-02 size-4" />
              </Button>
            </div>

            <div class="gap-2 grid">
              <Label class="text-xs">{{ $t('chat.settings.providerDialog.model.capabilities') }}</Label>

              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="preset of ATTACHMENT_PRESETS" :key="preset.accept"
                  type="button"
                  class="text-xs px-2 py-0.5 border rounded-full transition-colors"
                  :class="hasAccept(modelSettings, preset.accept)
                    ? 'bg-mainGradient text-white border-transparent'
                    : 'border-secondary-300 dark:border-secondary-700 opacity-70 hover:opacity-100'"
                  @click="toggleAccept(modelSettings, preset.accept)"
                >
                  {{ $t(`chat.settings.providerDialog.capability.${preset.key}`) }}
                </button>
              </div>

              <TagsInput
                :model-value="modelSettings.attachments ?? []"
                @update:model-value="setAccepts(modelSettings, $event)"
              >
                <TagsInputItem v-for="accept in modelSettings.attachments ?? []" :key="accept" :value="accept">
                  <TagsInputItemText />
                  <TagsInputItemDelete />
                </TagsInputItem>

                <TagsInputInput :placeholder="$ts('chat.settings.providerDialog.model.acceptsPlaceholder')" />
              </TagsInput>

              <button
                type="button"
                class="text-xs px-2 py-0.5 border rounded-full w-fit transition-colors"
                :class="modelSettings.tools
                  ? 'bg-mainGradient text-white border-transparent'
                  : 'border-secondary-300 dark:border-secondary-700 opacity-70 hover:opacity-100'"
                @click="toggleTools(modelSettings)"
              >
                {{ $t('chat.settings.providerDialog.capability.tools') }}
              </button>
            </div>

            <div class="gap-2 grid">
              <Label class="text-xs">{{ $t('chat.settings.providerDialog.model.generation') }}</Label>
              <div class="gap-2 grid grid-cols-3">
                <div class="gap-1 grid">
                  <Label class="text-xs opacity-70" :for="`temperature-${model}`">
                    {{ $t('chat.settings.providerDialog.model.temperature') }}
                  </Label>
                  <Input
                    :id="`temperature-${model}`" type="number" step="0.1" min="0" max="2" class="h-8"
                    :model-value="modelSettings.temperature ?? ''"
                    @change="setGeneration(modelSettings, 'temperature', $event)"
                  />
                </div>

                <div class="gap-1 grid">
                  <Label class="text-xs opacity-70" :for="`topP-${model}`">
                    {{ $t('chat.settings.providerDialog.model.topP') }}
                  </Label>
                  <Input
                    :id="`topP-${model}`" type="number" step="0.05" min="0" max="1" class="h-8"
                    :model-value="modelSettings.topP ?? ''"
                    @change="setGeneration(modelSettings, 'topP', $event)"
                  />
                </div>

                <div class="gap-1 grid">
                  <Label class="text-xs opacity-70" :for="`maxOutputTokens-${model}`">
                    {{ $t('chat.settings.providerDialog.model.maxOutputTokens') }}
                  </Label>
                  <Input
                    :id="`maxOutputTokens-${model}`" type="number" step="1" min="1" class="h-8"
                    :model-value="modelSettings.maxOutputTokens ?? ''"
                    @change="setGeneration(modelSettings, 'maxOutputTokens', $event)"
                  />
                </div>
              </div>
            </div>

            <div class="gap-2 grid">
              <Label class="text-xs" :for="`traits-${model}`">
                {{ $t('chat.settings.providerDialog.model.traits') }}
              </Label>
              <Textarea
                :id="`traits-${model}`" class="text-xs min-h-16"
                :model-value="modelSettings.traits ?? ''"
                :placeholder="$ts('chat.settings.providerDialog.model.traitsPlaceholder')"
                @update:model-value="setTraits(modelSettings, $event)"
              />
            </div>
          </div>

          <div class="flex gap-2">
            <Input
              v-model="newModelName" class="flex-1 h-8"
              :placeholder="$ts('chat.settings.providerDialog.addModel.placeholder')"
              @keydown.enter.prevent="addModel"
            />
            <Button class="h-8" variant="outline" @click="addModel">
              {{ $t('chat.settings.providerDialog.addModel.button') }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
