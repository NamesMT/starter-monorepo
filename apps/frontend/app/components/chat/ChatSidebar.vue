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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/lib/shadcn/components/ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from '@/lib/shadcn/components/ui/sidebar'
import { Button } from '~/lib/shadcn/components/ui/button'

const { $auth, $init } = useNuxtApp()
const colorMode = useColorMode()
const convex = useConvexClient()
const chatContext = useChatContext()

const threadIdRef = useThreadIdRef()

// Load local threads
const { data: threads } = useIDBKeyval<Doc<'threads'>[]>('threads', [])
const { data: pinnedThreadIds } = useIDBKeyval<string[]>('pinnedThreadIds', [])
const isFetching = ref(false)

// Subscribe to Convex to sync threads
if ($auth.loggedIn) {
  const { data: threadsFromConvex, isLoading: fetchingFromConvex } = useConvexQuery(api.threads.listByUser)
  watch(threadsFromConvex, (tFC) => {
    // Keep threads that are not assigned to any users
    // Must reconstruct array or else it cant be cloned to IDB.
    threads.value = JSON.parse(JSON.stringify(
      [...tFC, ...threads.value.filter(t => !t.userId)],
    ))
  })
  watch(fetchingFromConvex, (fFC) => {
    isFetching.value = fFC
  })

  // Migrate anonymous threads to user account
  watch(threads, () => {
    // TODO
  })
}
// For anonymous users, subscribe to threads via sessionId
else {
  const { data: threadsFromConvex, isLoading: fetchingFromConvex } = useConvexQuery(api.threads.listBySessionId, { sessionId: $init.sessionId })
  watch(threadsFromConvex, (tFC) => {
    // Keep threads from other sessionIds, that are not assigned to any users
    // Must reconstruct array or else it cant be cloned to IDB.
    threads.value = JSON.parse(JSON.stringify(
      [
        ...tFC.map(t => ({ ...t, lockerKey: getLockerKey(t._id) })),
        ...threads.value.filter(t => !t.userId && t.sessionId !== $init.sessionId),
      ],
    ))
  })
  watch(fetchingFromConvex, (fFC) => {
    isFetching.value = fFC
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
  await deleteThread(convex, { threadId: thread._id, lockerKey: $auth.loggedIn ? undefined : thread.lockerKey })
}

const [DefineDeleteBtn, ReuseDeleteBtn] = createReusableTemplate<{ thread: Doc<'threads'> }>()
const [DefineThreadLiItem, ReuseThreadLiItem] = createReusableTemplate<{ thread: Doc<'threads'>, pinned?: boolean }>()
</script>

<template>
  <Sidebar>
    <SidebarHeader class="p-4">
      <div class="absolute right-3 top-3">
        <Button
          variant="ghost" size="icon"
          class="size-7"
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
        <div class="i-hugeicons:bubble-chat-search shrink-0" />
        <input v-model="searchQuery" type="text" placeholder="Search chats..." class="w-full bg-transparent outline-none">
        <Button v-show="searchQuery" class="size-6 shrink-0" variant="ghost" size="icon" @click="searchQuery = ''">
          <div class="i-hugeicons:cancel-01" />
        </Button>
      </div>
    </SidebarHeader>
    <SidebarContent class="p-2">
      <SidebarGroup v-if="!threads?.length">
        <div class="py-4 text-center text-gray-500 dark:text-gray-400">
          {{ isFetching
            ? $t('chat.sidebar.threads.loading')
            : $t('chat.sidebar.threads.empty') }}
        </div>
      </SidebarGroup>
      <template v-else>
        <!-- Define reusable items -->
        <div class="hidden">
          <DefineDeleteBtn v-slot="{ thread }">
            <AlertDialog>
              <AlertDialogTrigger v-show="!thread.userId || (thread.userId === $auth?.user?.sub)" as-child>
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
                <!-- Delay already set on provider but seems bugged -->
                <Tooltip :delay-duration="500">
                  <TooltipTrigger as-child>
                    <div class="line-clamp-1">
                      {{ thread.title }}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" :side-offset="6" class="border-none p-0 light:bg-gray-100">
                    <div class="px-3 py-1 light:bg-primary-50/20">
                      <p>{{ thread.title }}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>

                <LiquidGlassDiv
                  class="right-0 top-0 h-full flex translate-x-[calc(100%+1rem)] items-center gap-1 px-2 pr-1 transition-transform will-change-transform $c-radius=6px absolute! group-hover/thread:translate-x-0"
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

        <SidebarGroup v-show="threadsPartitioned[1].length" class="flex flex-col gap-2">
          <h4 class="mx-1 flex gap-1 text-xs text-primary">
            <div class="i-hugeicons:pin" /><div>{{ $t('pinned') }}</div>
          </h4>
          <ul class="space-y-1">
            <ReuseThreadLiItem v-for="thread in threadsPartitioned[1]" :key="thread._id" :thread="thread" :pinned="true" />
          </ul>
        </SidebarGroup>

        <SidebarGroup v-show="filteredThreads.length" class="flex flex-col gap-2">
          <h4 class="mx-1 flex gap-1 text-xs text-primary">
            <div>{{ $t('recent') }}</div>
          </h4>
          <ul class="space-y-1">
            <ReuseThreadLiItem v-for="thread in filteredThreads" :key="thread._id" :thread="thread" />
          </ul>
        </SidebarGroup>
      </template>
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton class="h-auto w-full flex items-center justify-between">
                <div class="h-9 flex items-center gap-2 truncate text-sm leading-tight">
                  <template v-if="$auth.loggedIn">
                    <Avatar shape="square" size="sm" class="size-9" alt="User avatar">
                      <AvatarImage :src="$auth.user.picture" alt="Avatar image" />
                      <AvatarFallback>👤</AvatarFallback>
                    </Avatar>
                    <div class="truncate">
                      <p>{{ $auth.user.name }}</p>
                      <p class="truncate text-xs">
                        {{ $auth.user.email }}
                      </p>
                    </div>
                  </template>
                  <template v-else>
                    <Avatar shape="square" size="sm" class="size-9" alt="Guest placeholder avatar">
                      <AvatarFallback>🍳</AvatarFallback>
                    </Avatar>
                    <div class="truncate">
                      <p>{{ $t('guest') }}</p>
                      <p class="truncate text-xs">
                        {{ $t('loginToEnjoyMore') }}
                      </p>
                    </div>
                  </template>
                </div>
                <div class="i-hugeicons:dashboard-square-setting size-5 shrink-0" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              class="w-[--reka-popper-anchor-width]"
            >
              <DropdownMenuItem class="justify-between" @click="chatContext.insaneUI.value = !chatContext.insaneUI.value">
                <div>{{ 'InsaneUI' }}</div>
                <div :class="chatContext.insaneUI.value ? ' i-hugeicons:crazy bg-mainGradient' : ' i-hugeicons:confused'" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
