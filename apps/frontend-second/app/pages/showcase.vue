<script setup lang="ts">
import { toast } from 'vue-sonner'
import LiquidGlassDiv from '#layers/nuxt-layer-common/app/components/LiquidGlassDiv.vue'

definePageMeta({
  title: 'pages.test.title',
})

const cards = ['alpha', 'beta', 'gamma']
const glass = ref(true)

function promiseToast() {
  toast.promise(
    new Promise<{ name: string }>(resolve => setTimeout(resolve, 1500, { name: 'Sonner' })),
    {
      loading: 'Creating the event...',
      success: (data: { name: string }) => `${data.name} toast has been added`,
      error: 'Event has not been created',
    },
  )
}

function actionToast() {
  toast('Event has been created', {
    description: 'Sunday, December 03, 2023 at 9:00 AM',
    action: { label: 'Undo', onClick: () => toast.info('Undo clicked') },
  })
}
</script>

<template>
  <div class="mx-auto px-5 py-10 flex flex-col gap-6 max-w-3xl w-full">
    <div>
      <h1 class="text-2xl font-bold">
        {{ $t('pages.test.title') }}
      </h1>
      <p class="text-sm text-surface-500">
        {{ $t('pages.test.intro') }}
      </p>
    </div>

    <!-- Glass backdrop: the displacement only reads against sharp detail, not a smooth blur. -->
    <div class="p-6 rounded-2xl bg-surface-950 [--c-radius:0.75rem] relative overflow-hidden">
      <div class="bg-[radial-gradient(circle_at_15%_20%,var(--primary-500),transparent_55%)] inset-0 absolute" />
      <div class="bg-[radial-gradient(circle_at_85%_25%,var(--secondary-500),transparent_55%)] inset-0 absolute" />
      <div class="bg-[radial-gradient(circle_at_50%_110%,var(--primary-400),transparent_60%)] inset-0 absolute" />
      <div class="opacity-30 [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:22px_22px] inset-0 absolute" />
      <div class="border-2 border-white/80 rounded-full h-28 w-28 left-6 top-6 absolute" />
      <div class="bg-secondary-400 h-16 w-16 rotate-12 bottom-8 right-8 absolute" />
      <div class="rounded-lg bg-primary-300 h-20 w-20 left-1/2 top-1/3 absolute -rotate-6" />
      <div class="bg-white/80 h-2.5 w-40 bottom-1/4 left-8 absolute" />
      <div class="rounded-full bg-secondary-400 opacity-50 h-32 w-32 absolute blur-xl -left-6 -top-6" />
      <div class="rounded-full bg-primary-300 opacity-50 h-32 w-32 bottom-0 absolute blur-xl -right-4" />

      <div class="gap-4 grid relative sm:grid-cols-3">
        <component
          :is="glass ? LiquidGlassDiv : 'div'"
          v-for="card in cards"
          :key="card"
          class="p-4 flex min-h-28 capitalize items-center justify-center"
          :class="!glass && 'border border-white/15 rounded-xl bg-surface-800/60'"
        >
          <span class="text-lg text-white font-semibold drop-shadow">{{ card }}</span>
        </component>
      </div>
    </div>

    <label class="text-sm flex gap-2 items-center">
      <Switch v-model="glass" />
      Liquid glass (layer component)
    </label>

    <div class="p-4 border rounded-xl flex flex-col gap-3">
      <div>
        <h2 class="font-semibold">
          Sonner toasts
        </h2>
        <p class="text-xs text-surface-500">
          Toaster mounted globally by the layer.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" @click="toast('Event has been created')">
          Default
        </Button>
        <Button variant="secondary" @click="toast.success('Event has been created')">
          Success
        </Button>
        <Button variant="secondary" @click="toast.info('Be at the area 10 minutes before the event begins')">
          Info
        </Button>
        <Button variant="secondary" @click="toast.warning('Event start time cannot be earlier than 8am')">
          Warning
        </Button>
        <Button variant="secondary" @click="toast.error('Event has not been created')">
          Error
        </Button>
        <Button variant="secondary" @click="promiseToast">
          Promise
        </Button>
        <Button variant="secondary" @click="actionToast">
          With action
        </Button>
      </div>
    </div>

    <NuxtLink to="/" class="text-sm text-primary-500 underline">
      ← {{ $t('pages.home.title') }}
    </NuxtLink>
  </div>
</template>
