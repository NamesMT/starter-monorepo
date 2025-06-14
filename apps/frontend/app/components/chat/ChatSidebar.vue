<script setup lang="ts">
import type { Doc } from 'backend-convex/convex/_generated/dataModel'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { api } from 'backend-convex/convex/_generated/api'
import { useConvexQuery } from 'convex-vue'
import { computed, ref } from 'vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/lib/shadcn/components/ui/alert-dialog'
import { Button } from '~/lib/shadcn/components/ui/button'

const { $auth } = useNuxtApp()
const colorMode = useColorMode()
const convex = useConvexClient()

// For [...all] routing the value is an array
const threadIdRef = useRouteParams<string>('all', undefined, { transform: { get: s => Array.isArray(s) ? s[0] : s } })

// Load local threads
const { data: threads } = useIDBKeyval<Doc<'threads'>[]>('threads', [])
const { data: pinnedThreadIds } = useIDBKeyval<string[]>('pinnedThreadIds', [])
const isFetching = ref(false)

// Subscribe to Convex to sync threads
if ($auth.loggedIn) {
  const { data: threadsFromConvex, isLoading: fetchingFromConvex } = useConvexQuery(api.threads.list)
  watch(threadsFromConvex, (tFC) => {
    // Must reconstruct tFC or else it cant be cloned to IDB after modifications
    const newArr: typeof tFC = JSON.parse(JSON.stringify(tFC))
    // Keep threads that are not assigned to any users
    threads.value = [...newArr, ...threads.value.filter(t => !t.userId)]
  })
  watch(fetchingFromConvex, (fFC) => {
    isFetching.value = fFC
  })

  // Migrate anonymous threads to user account
  watch(threads, () => {
    // TODO
  })
}

// Fuck TS in these situations
// [other, pinned]
const threadsPartitioned = useArrayReduce(threads, (a, c) => {
  if (pinnedThreadIds.value.includes(c._id))
    return [a[0], a[1].concat(c)] as [Doc<'threads'>[], Doc<'threads'>[]]
  return [a[0].concat(c), a[1]] as [Doc<'threads'>[], Doc<'threads'>[]]
}, [[], []] as [Doc<'threads'>[], Doc<'threads'>[]])

const searchQuery = ref('')
const filteredThreads = computed(() => {
  if (!searchQuery.value)
    return threadsPartitioned.value[0]
  return threadsPartitioned.value[0].filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

const activeThread = computed<Doc<'threads'> | undefined>(() => {
  if (!threadIdRef.value)
    return undefined

  return threads.value.find(thread => thread._id === threadIdRef.value)
})
useHead({
  title: computed(() => activeThread.value?.title ?? '> New Chat'),
})

function pinThread(thread: Doc<'threads'>) {
  pinnedThreadIds.value.push(thread._id)
}

function unpinThread(thread: Doc<'threads'>) {
  pinnedThreadIds.value.splice(pinnedThreadIds.value.indexOf(thread._id), 1)
}

async function _deleteThread(thread: Doc<'threads'>) {
  threads.value.splice(threads.value.indexOf(thread), 1)
  await deleteThread(convex, thread._id)
}

const [DefineDeleteBtn, ReuseDeleteBtn] = createReusableTemplate<{ thread: Doc<'threads'> }>()
const [DefineThreadLiItem, ReuseThreadLiItem] = createReusableTemplate<{ thread: Doc<'threads'>, pinned?: boolean }>()
</script>

<template>
  <div
    class="relative h-full flex flex-col gap-y-4 border-r border-gray-200 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-800"
  >
    <div class="absolute left-4 top-3">
      <Button
        variant="ghost" size="icon"
        @click="colorMode.preference = (colorMode.preference === 'dark') ? 'light' : 'dark'"
      >
        <div>{{ colorMode.preference === 'dark' ? '🌙' : '🌞' }}</div>
      </Button>
    </div>

    <div class="flex justify-center">
      <NuxtLink to="/">
        <Logo class="h-10" />
      </NuxtLink>
    </div>

    <div>
      <NuxtLink :to="{ name: 'chat-all' }" exact-active-class="[&>*]:(bg-accent/80! hover:bg-accent/100!)">
        <Button class="w-full" variant="outline" size="sm">
          {{ $t('chat.sidebar.newChat') }}
        </Button>
      </NuxtLink>
    </div>

    <div class="flex items-center gap-2 border-b px-2 py-1">
      <div class="i-hugeicons:bubble-chat-search" />
      <input v-model="searchQuery" type="text" placeholder="Search chats..." class="w-full bg-transparent outline-none">
    </div>

    <div v-if="!threads?.length && isFetching" class="py-4 text-center text-gray-500 dark:text-gray-400">
      {{ $t('chat.sidebar.threads.loading') }}
    </div>
    <div v-else-if="!threads?.length" class="py-4 text-center text-gray-500 dark:text-gray-400">
      {{ $t('chat.sidebar.threads.empty') }}
    </div>
    <div v-else class="flex flex-col gap-6 overflow-y-auto text-sm">
      <!-- Define reusable items -->
      <div class="hidden">
        <DefineDeleteBtn v-slot="{ thread }">
          <AlertDialog>
            <AlertDialogTrigger as-child>
              <Button tabindex="-1" variant="ghost" size="icon" class="size-7 transition-none" @pointerdown.stop.prevent>
                <div class="i-hugeicons:delete-put-back" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{{ $t('chat.sidebar.deleteThread.title') }}</AlertDialogTitle>
                <AlertDialogDescription class="whitespace-pre-line">
                  {{ $t('chat.sidebar.deleteThread.description', { name: thread.title }) }}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{{ $t('cancel') }}</AlertDialogCancel>
                <AlertDialogAction @click="_deleteThread(thread)">
                  {{ $t('confirm') }}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DefineDeleteBtn>

        <DefineThreadLiItem v-slot="{ thread, pinned }">
          <li>
            <!-- Using [&.active] instead of :active-class because of reactivity bug -->
            <NuxtLink
              :to="`/chat/${thread._id}`"
              class="group/thread relative block overflow-hidden rounded-md p-2 px-3 [&.router-link-exact-active]:bg-primary/10 hover:bg-primary/20"
            >
              <div>
                {{ thread.title }}
              </div>
              <LiquidGlassDiv
                class="right-0 top-0 h-full flex translate-x-[calc(100%+1rem)] items-center px-2 transition-transform will-change-transform $c-radius=$radius absolute! group-hover/thread:translate-x-0"
                @click.stop.prevent
              >
                <Button
                  tabindex="-1" variant="ghost" size="icon" class="size-7 transition-none hover:bg-surface-200/20!"
                  @pointerdown.stop.prevent @click="pinned ? unpinThread(thread) : pinThread(thread)"
                >
                  <div :class="[pinned ? 'i-hugeicons:pin-off' : 'i-hugeicons:pin']" />
                </Button>
                <ReuseDeleteBtn :thread />
              </LiquidGlassDiv>
            </NuxtLink>
          </li>
        </DefineThreadLiItem>
      </div>

      <div v-show="threadsPartitioned[1].length" class="flex flex-col gap-2">
        <h4 class="mx-1 flex gap-1 text-xs text-primary">
          <div class="i-hugeicons:pin" /><div>{{ $t('pinned') }}</div>
        </h4>
        <ul class="space-y-2">
          <ReuseThreadLiItem v-for="thread in threadsPartitioned[1]" :key="thread._id" :thread="thread" :pinned="true" />
        </ul>
      </div>

      <div v-show="filteredThreads.length" class="flex flex-col gap-2">
        <h4 class="mx-1 flex gap-1 text-xs text-primary">
          <div>{{ $t('recent') }}</div>
        </h4>
        <ul class="space-y-2">
          <ReuseThreadLiItem v-for="thread in filteredThreads" :key="thread._id" :thread="thread" />
        </ul>
      </div>
    </div>
  </div>
</template>
