<script setup lang="ts">
import LiquidGlassDiv from '#layers/nuxt-layer-common/app/components/LiquidGlassDiv.vue'

const {
  message,
} = defineProps<{
  message: CustomMessage
}>()

const emit = defineEmits<{
  branchOffClicked: []
  regenerateClicked: []
}>()

const chatContext = useChatContext()

/** Streaming with nothing to show yet. */
const isGenerating = computed(() =>
  !!message.isStreaming && !(message.parts ?? []).some(part => part.type !== 'step-start'),
)
</script>

<template>
  <div
    class="group/message flex relative"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start pb-10'"
  >
    <component
      :is="chatContext.insaneUI.value ? LiquidGlassDiv : 'div'"
      class="border rounded-$radius $c-radius=$radius" :class="[
        message.role === 'user'
          ? 'bg-secondary-100 dark:bg-secondary-950 border-secondary-200 max-w-80% lg:max-w-2xl'
          : 'bg-primary-100 dark:bg-primary-950 border-primary-200 max-w-full lg:max-w-3xl',
        chatContext.insaneUI.value
          ? 'bg-opacity-50!'
          : 'bg-opacity-5!',
      ]" tabindex="0"
    >
      <Card class="bg-transparent shadow-md">
        <!-- <CardHeader class="px-4 py-2">
                  <CardTitle class="text-sm font-semibold">
                    {{ message.role === 'user' ? $t('pages.chat.userLabel') : $t('pages.chat.aiLabel') }}
                  </CardTitle>
                </CardHeader> -->
        <CardContent class="px-4 py-3 [&_.prose-hr]:(border-accent-foreground!)">
          <div v-if="isGenerating" class="flex gap-2">
            <div>{{ $t('generating') }}</div>
            <div class="spinner h-5 w-5" />
          </div>

          <!-- Parts render in order, so text, thinking and tool calls appear where they happened. -->
          <template v-for="(part, index) of message.parts ?? []" :key="index">
            <MDC
              v-if="part.type === 'text' && part.text"
              :key="`t-${index}-${message.isStreaming}`"
              :value="part.text"
              class="only-child:[&>.prose-p]:my-0"
            />
            <ChatMessageReasoning
              v-else-if="part.type === 'reasoning' && part.text"
              :part="part"
              :streaming="!!message.isStreaming"
            />
            <ChatMessageToolInvocations
              v-else-if="part.type === 'dynamic-tool'"
              :invocations="[part]"
            />
          </template>

          <ChatMessageAttachments :attachments="message.attachments ?? []" />

          <!-- Placeholder while a reply has nothing to show yet. Explicit rather than
               positional (`hidden first:block`), which showed it forever whenever the parts
               rendered nothing — e.g. a user message still stored as legacy `content`. -->
          <div v-if="isGenerating">
            <Skeleton
              class="rounded-full bg-muted-foreground h-5 max-w-full w-$c-W" :style="{
                '--c-W': `${(Math.floor(Math.random() * (300 - 100 + 1)) + 100) * (message.role === 'user' ? 1 : 2)}px`,
              }"
            />
          </div>
        </CardContent>
      </Card>
    </component>

    <div
      v-if="message.role === 'user'"
      class="opacity-0 flex gap-1 transition-opacity top-100% absolute group-hover/message:opacity-100"
    >
      <div v-if="message.context?.from" class="text-xs mr-2">
        {{ message.context.from }}
      </div>
    </div>

    <div
      v-else
      class="opacity-0 flex gap-1 transition-opacity bottom-2 left-2 absolute group-hover/message:opacity-100"
    >
      <CardCopyButton :message />
      <CardBranchOffButton :message @click="emit('branchOffClicked')" />
      <CardRegenerateButton :message @regenerate="emit('regenerateClicked')" />
      <div class="text-xs ml-4">
        {{ message.model }}
      </div>
    </div>
  </div>
</template>
