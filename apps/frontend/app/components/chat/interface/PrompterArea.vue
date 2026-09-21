<script setup lang="ts">
import type Lenis from 'lenis'
import type { ChatAttachmentManager } from '~/utils/chat/attachments'
import { useSidebar } from '#layers/nuxt-layer-common/app/lib/shadcn/components/ui/sidebar'
import { useToast } from '#layers/nuxt-layer-common/app/lib/shadcn/components/ui/toast'

const props = defineProps<{
  nearTopBottom: Array<null | boolean | number>
  lenisRef: undefined | { $el: HTMLElement, lenis: Lenis }
  streamingMessagesMap: Record<string, true>
  attachments: ChatAttachmentManager
}>()

const emit = defineEmits<{
  submit: [payload: { input: string }]
}>()

const chatInput = defineModel<string>('chatInput', { required: true })

const isDev = import.meta.dev
const sidebarContext = useSidebar()
const chatContext = useChatContext()
const { ts } = useI18n()
const { toast } = useToast()

const multiStreamConfirmDialogOpen = ref(false)
const { textarea: chatTextarea, input: chatInputTA } = useTextareaAutosize()
const chatPlaceholder = computedWithControl(chatContext.interfaceSRK, () =>
  `${ts('chat.typeYourMessageHere')}\n${getRandomThoughtPlaceholder()}`)
syncRef(chatInput, chatInputTA)

// Derived state from the attachment manager (nested refs are not unwrapped through props).
const attachmentItems = computed(() => props.attachments.items.value)
const hasAttachments = computed(() => props.attachments.hasAttachments.value)
const isUploading = computed(() => props.attachments.isUploading.value)
const hasErrors = computed(() => props.attachments.hasErrors.value)

const attachmentAccept = computed(() => chatContext.activeAgent.value.modelSettings?.attachments ?? [])
const canAttach = computed(() => attachmentAccept.value.length > 0)

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const isDragging = ref(false)

function stageFiles(files: Iterable<File>) {
  if (!canAttach.value)
    return

  const { errors } = props.attachments.addFiles(files, attachmentAccept.value)
  for (const description of errors)
    toast({ variant: 'destructive', description })
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  stageFiles(Array.from(input.files ?? []))
  input.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  stageFiles(Array.from(event.dataTransfer?.files ?? []))
}

function onPaste(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files ?? [])
  if (!files.length)
    return

  event.preventDefault()
  stageFiles(files)
}

function handleSubmit({ confirmMultiStream = false } = {}) {
  const userInput = chatInputTA.value.trim()
  if (!userInput && !hasAttachments.value)
    return

  if (isUploading.value)
    return

  if (!confirmMultiStream && Object.keys(props.streamingMessagesMap).length > 0) {
    multiStreamConfirmDialogOpen.value = true
    return
  }

  emit('submit', { input: chatInputTA.value })
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
        :class="props.nearTopBottom[0] ? 'invisible opacity-0' : ''" @click="props.lenisRef!.lenis.scrollTo('top')"
      >
        <div class="i-hugeicons:circle-arrow-up-03 h-full w-full" />
      </Button>
      <Button
        variant="outline" size="icon" class="p-1 rounded-xl opacity-100 transition-opacity duration-500"
        :class="props.nearTopBottom[1] ? 'invisible opacity-0' : ''" @click="props.lenisRef!.lenis.scrollTo('bottom')"
      >
        <div class="i-hugeicons:circle-arrow-down-03 h-full w-full" />
      </Button>
    </div>

    <div>
      <form
        class="text-secondary-950 mx-auto p-3 pb-2 border-x-6px border-rose/80 bg-rose/20 flex flex-col gap-2 max-w-2xl backdrop-blur-sm dark:text-secondary-50"
        :class="isDragging ? 'outline-2 outline-dashed outline-accent' : ''"
        @submit.prevent
        @dragover.prevent="canAttach && (isDragging = true)"
        @dragleave="isDragging = false"
        @drop.prevent="onDrop"
      >
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
          @paste="onPaste"
        />

        <ChatComposerAttachments
          :items="attachmentItems"
          @remove="(id) => props.attachments.remove(id)"
        />

        <div class="flex items-center justify-between">
          <div class="flex gap-2 items-center">
            <AgentSelector />

            <Button
              v-if="canAttach"
              variant="ghost" size="icon" class="p-1 rounded-full size-7"
              :disabled="!props.attachments.canAddMore.value"
              @click="() => fileInput?.click()"
            >
              <div class="i-hugeicons:attachment-01 h-5 w-5" />
            </Button>
            <input
              ref="fileInput" type="file" multiple class="hidden"
              :accept="attachmentAccept.join(', ')"
              @change="onFileInputChange"
            >
          </div>
          <Button
            variant="default"
            size="icon"
            class="i-hugeicons:upload-square-01 disabled:bg-surface-500 enabled:bg-mainGradient"
            :class="chatContext.insaneUI.value ? 'enabled:animate-spin' : 'motion-safe:enabled:animate-bounce'"
            :disabled="(!chatInputTA && !hasAttachments) || isUploading || hasErrors"
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
