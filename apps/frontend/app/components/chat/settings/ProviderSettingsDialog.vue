<script setup lang="ts">
import type { CommonProviderAgentsSettings } from '@local/common/src/chat'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/lib/shadcn/components/ui/dialog'
import { Input } from '@/lib/shadcn/components/ui/input'
import { Label } from '@/lib/shadcn/components/ui/label'
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from '@/lib/shadcn/components/ui/tags-input'

const {
  name,
  settings,
} = defineProps<{
  name: string
  settings: CommonProviderAgentsSettings
}>()

const modelsRef = ref(Object.keys(settings.models))
watch(modelsRef, () => {
  // eslint-disable-next-line vue/no-mutating-props
  settings.models = modelsRef.value.reduce((obj, m) => {
    obj[m] = { enabled: true }
    return obj
  }, {} as CommonProviderAgentsSettings['models'])
})
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ $t(`chat.provider.${name}`) }}</DialogTitle>
        <DialogDescription>
          {{ $t('chat.settings.providerDialog.description') }}
        </DialogDescription>
      </DialogHeader>
      <div class="py-4 gap-4 grid">
        <div class="gap-1.5 grid items-center">
          <Label for="provider-settings-dialog_apiKey">{{ $t('chat.settings.providerDialog.form.apiKey') }}</Label>
          <!-- eslint-disable-next-line vue/no-mutating-props -->
          <Input id="provider-settings-dialog_apiKey" v-model="settings.apiKey" type="password" />
        </div>
        <div class="gap-1.5 grid items-center">
          <Label for="provider-settings-dialog_apiKey">{{ $t('chat.settings.providerDialog.form.models') }}</Label>
          <!-- eslint-disable-next-line vue/no-mutating-props -->
          <TagsInput v-model="modelsRef">
            <TagsInputItem v-for="model in modelsRef" :key="model" :value="model">
              <TagsInputItemText />
              <TagsInputItemDelete />
            </TagsInputItem>

            <TagsInputInput :placeholder="$t('form.tagsInput.placeholder')" />
          </TagsInput>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
