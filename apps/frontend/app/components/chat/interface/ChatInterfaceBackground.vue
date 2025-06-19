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
      v-if="chatContext.insaneUI.value" class="pointer-events-none absolute inset-0 z-0 place-content-center"
      :square-size="10" :grid-gap="5" color="#60A5FA" :max-opacity="0.5" :flicker-chance="0.1"
    />

    <div
      v-show="!messages.length && !isFetching"
      class="absolute left-0 z-0 w-full place-content-center overflow-hidden transition-height h-dvh"
    >
      <IUIMaybeGlassCard
        v-if="!messages.length"
        :key="chatContext.interfaceSRK.value"
        v-motion-pop-visible-once
        class="relative z-2 mx-auto w-fit whitespace-pre-wrap px-10 py-6 text-center text-4xl font-medium tracking-tighter opacity-100!"
      >
        <p>
          {{ threadIdRef ? $t('chat.interface.sendToStart') : $t('chat.interface.selectOrStart') }}
        </p>
      </IUIMaybeGlassCard>
    </div>
  </div>
</template>
