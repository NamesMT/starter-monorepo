<script setup lang="ts">
const {
  messages,
  isFetching,
} = defineProps<{
  messages: Array<CustomMessage>
  isFetching: boolean
}>()

const threadIdRef = useThreadIdRef()
const chatContext = useChatContext()
</script>

<template>
  <div class="z-0">
    <FlickeringGrid
      v-if="chatContext.insaneUI.value" class="pointer-events-none inset-0 place-content-center absolute z-0"
      :square-size="10" :grid-gap="5" color="#60A5FA" :max-opacity="0.5" :flicker-chance="0.1"
    />

    <div
      v-show="!messages.length && !isFetching"
      class="w-full transition-height left-0 place-content-center absolute z-0 overflow-hidden h-dvh"
    >
      <IUIMaybeGlassCard
        v-if="!messages.length"
        :key="chatContext.interfaceSRK.value"
        v-motion-pop-visible-once
        class="text-4xl tracking-tighter font-medium mx-auto px-10 py-6 text-center w-fit whitespace-pre-wrap relative z-2 opacity-100!"
      >
        <p>
          {{ threadIdRef ? $t('chat.interface.sendToStart') : $t('chat.interface.selectOrStart') }}
        </p>
      </IUIMaybeGlassCard>
    </div>
  </div>
</template>
