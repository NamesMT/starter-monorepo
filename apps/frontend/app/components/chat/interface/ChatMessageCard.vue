<script setup lang="ts">
import LiquidGlassDiv from '~/components/LiquidGlassDiv.vue'

const {
  message,
} = defineProps<{
  message: CustomMessage
}>()

const emit = defineEmits<{
  branchOffClicked: []
}>()

const chatContext = useChatContext()
</script>

<template>
  <div
    class="group/message relative flex"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start pb-10'"
  >
    <component
      :is="chatContext.insaneUI.value ? LiquidGlassDiv : 'div'"
      class="border rounded-$radius $c-radius=$radius" :class="[
        message.role === 'user'
          ? 'bg-secondary-100 dark:bg-secondary-950 border-secondary-200 max-w-80% md:max-w-2xl'
          : 'bg-primary-100 dark:bg-primary-950 border-primary-200 max-w-full md:max-w-3xl',
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
          <div v-if="message.isStreaming && !message.content" class="flex gap-2">
            <div>{{ $t('generating') }}</div>
            <div class="spinner h-5 w-5" />
          </div>
          <MDC v-else :key="String(message.isStreaming)" :value="message.content" class="only-child:[&>.prose-p]:my-0" />
          <div class="hidden first:block">
            <Skeleton
              class="h-5 max-w-full w-$c-W rounded-full bg-muted-foreground" :style="{
                '--c-W': `${(Math.floor(Math.random() * (300 - 100 + 1)) + 100) * (message.role === 'user' ? 1 : 2)}px`,
              }"
            />
          </div>
        </CardContent>
      </Card>
    </component>

    <div
      v-if="message.role === 'user'"
      class="absolute right-2 top-100% flex gap-1 opacity-0 transition-opacity group-hover/message:opacity-100"
    >
      <div v-if="message.context?.from" class="text-xs">
        {{ message.context.from }}
      </div>
    </div>

    <div
      v-else
      class="absolute bottom-2 left-2 flex gap-1 opacity-0 transition-opacity group-hover/message:opacity-100"
    >
      <CardCopyButton :message />
      <CardBranchOffButton v-show="message.isStreaming === false" :message @click="emit('branchOffClicked')" />
      <div class="ml-4 text-xs">
        {{ message.model }}
      </div>
    </div>
  </div>
</template>
