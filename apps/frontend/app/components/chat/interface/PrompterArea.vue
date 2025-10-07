<script setup lang="ts">
import type Lenis from 'lenis'
import { useSidebar } from '~/lib/shadcn/components/ui/sidebar'

const props = defineProps<{
  nearTopBottom: Array<null | boolean | number>
  lenisRef: undefined | { $el: HTMLElement, lenis: Lenis }
  streamingMessagesMap: Record<string, true>
}>()

const emit = defineEmits<{
  submit: [payload: { input: string, files: File[] }]
}>()

const chatInput = defineModel<string>('chatInput', { required: true })
const attachments = ref<File[]>([])

const isDev = import.meta.dev
const sidebarContext = useSidebar()
const chatContext = useChatContext()
const { t } = useI18n()

const multiStreamConfirmDialogOpen = ref(false)
const { textarea: chatTextarea, input: chatInputTA } = useTextareaAutosize()
const chatPlaceholder = computedWithControl(chatContext.interfaceSRK, () =>
  `${t('chat.typeYourMessageHere')}\n${getRandomThoughtPlaceholder()}`)
syncRef(chatInput, chatInputTA)

function handleSubmit({ confirmMultiStream = false }) {
  const userInput = chatInputTA.value.trim()
  if (!userInput && attachments.value.length === 0)
    return

  if (!confirmMultiStream && Object.keys(props.streamingMessagesMap).length > 0) {
    multiStreamConfirmDialogOpen.value = true
    return
  }

  emit('submit', { input: chatInputTA.value, files: attachments.value })
  attachments.value = []
}
</script>

<template>
  <LiquidGlassDiv class="border-t border-secondary max-w-full w-full bottom-0 left-0 z-3 $c-radius=0px absolute!">
    <div v-if="isDev" class="bottom-100% absolute">
      <!-- {{ props.nearTopBottom }} -->
    </div>

    <div class="mb-2 flex flex-col gap-2 bottom-100% right-6 absolute">
      <Button
        variant="outline" size="icon" class="p-1 rounded-xl opacity-100 transition-opacity duration-500"
        :class="props.nearTopBottom[0] && 'invisible opacity-0'" @click="props.lenisRef!.lenis.scrollTo('top')"
      >
        <div class="i-hugeicons:circle-arrow-up-03 h-full w-full" />
      </Button>
      <Button
        variant="outline" size="icon" class="p-1 rounded-xl opacity-100 transition-opacity duration-500"
        :class="props.nearTopBottom[1] && 'invisible opacity-0'" @click="props.lenisRef!.lenis.scrollTo('bottom')"
      >
        <div class="i-hugeicons:circle-arrow-down-03 h-full w-full" />
      </Button>
    </div>

    <div>
      <form class="text-secondary-950 mx-auto p-3 pb-2 border-x-6px border-rose/80 bg-rose/20 flex flex-col gap-2 max-w-2xl backdrop-blur-sm dark:text-secondary-50" @submit.prevent>
        <textarea
          ref="chatTextarea"
          :key="chatContext.interfaceSRK.value"
          v-model="chatInputTA"
          :placeholder="chatPlaceholder"
          class="outline-none bg-transparent min-h-12 resize-none placeholder-secondary-700/60 dark:placeholder-secondary-300/60"
          @keydown.enter.exact="(e) => {
            if (!sidebarContext.isMobile.value) {
              e.preventDefault()
              handleSubmit({})
            }
          }"
          @keydown.enter.ctrl.exact="handleSubmit({})"
        />
        <div
          v-if="attachments.length"
          class="p-2 flex flex-nowrap gap-2 max-w-full truncate"
        >
          <div
            v-for="(file, index) of attachments" :key="index"
            class="text-xs p-1 px-2 rounded-md bg-surface-200/50 flex gap-2 truncate items-center"
          >
            <p class="truncate">
              {{ file.name }}
            </p>
            <button @click="attachments.splice(index, 1)">
              <div class="i-hugeicons:cancel-01 h-4 w-4" />
            </button>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex gap-2 items-center">
            <AgentSelector />

            <div v-if="chatContext.activeAgent.value.modelSettings?.attachments?.length" class="flex gap-2 items-center">
              <Button
                variant="ghost" size="icon" class="p-1 rounded-full size-7"
                @click="() => ($refs.fileInput as HTMLInputElement).click()"
              >
                <div class="i-hugeicons:attachment-01 h-5 w-5" />
              </Button>
              <input
                ref="fileInput" type="file" multiple class="hidden"
                :accept="chatContext.activeAgent.value.modelSettings?.attachments.join(', ')"
                @change="(e) => attachments = Array.from((e.target as HTMLInputElement).files ?? [])"
              >
            </div>
          </div>
          <Button
            variant="default"
            size="icon"
            class="i-hugeicons:upload-square-01 disabled:bg-surface-500 enabled:bg-mainGradient"
            :class="chatContext.insaneUI.value ? 'enabled:animate-spin' : 'motion-safe:enabled:animate-bounce'"
            :disabled="!chatInputTA && attachments.length === 0"
            @click="handleSubmit({})"
          />
        </div>
      </form>
    </div>
  </LiquidGlassDiv>

  <MultiStreamConfirmDialog
    v-model:open="multiStreamConfirmDialogOpen"
    @confirm="handleSubmit({ confirmMultiStream: true })"
  />
</template>
