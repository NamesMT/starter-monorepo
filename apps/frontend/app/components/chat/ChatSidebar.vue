<script setup lang="ts">
import type { Doc } from 'backend-convex/convex/_generated/dataModel'
import { api } from 'backend-convex/convex/_generated/api'
import { useConvexQuery } from 'convex-vue'
import { computed, ref } from 'vue'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/lib/shadcn/components/ui/context-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from '@/lib/shadcn/components/ui/sidebar'
import { Button } from '~/lib/shadcn/components/ui/button'
import { useToast } from '~/lib/shadcn/components/ui/toast'

const { $auth, $init } = useNuxtApp()
const colorMode = useColorMode()
const convex = useConvexClient()
const chatContext = useChatContext()
const sidebarContext = useSidebar()
const { toast } = useToast()
const { t } = useI18n()
const { copy } = useClipboard({ legacy: true })

const threadIdRef = useThreadIdRef()

const threads = chatContext.threads
const pinnedThreadIds = chatContext.pinnedThreadIds
const isFetching = ref(false)

// Subscribe to Convex to sync threads
if ($auth.loggedIn) {
  const { data: threadsFromConvex, isLoading: fetchingFromConvex } = useConvexQuery(api.threads.listByUser)
  watch(threadsFromConvex, (tFC) => {
    // Keep threads that are not assigned to any users
    // Must reconstruct array or else it cant be cloned to IDB.
    threads.value = JSON.parse(JSON.stringify(
      [
        ...threads.value.filter(t => !t.userId),
        ...tFC,
      ].sort((a, b) => b.timestamp - a.timestamp),
    ))
  })
  watch(fetchingFromConvex, (fFC) => {
    isFetching.value = fFC
  })

  // Migrate anonymous threads to user account
  until(fetchingFromConvex).not.toBeTruthy({ timeout: 5000 }).then(() => {
    for (const thread of threads.value) {
      if (thread && !thread.userId) {
        // eslint-disable-next-line no-console
        console.info(`Migrating thread: ${thread._id} to user account`)
        thread.userId = $auth.user.sub
        migrateThreadToUser(convex, { threadId: thread._id, lockerKey: getLockerKey(thread._id) })
          .catch(async () => {
            await refreshThread(convex, { threadId: thread._id, chatContext })
          })
      }
    }
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
        ...threads.value.filter(t => !t.userId && t.sessionId !== $init.sessionId),
        ...tFC.map(t => ({ ...t, lockerKey: getLockerKey(t._id) })),
      ].sort((a, b) => b.timestamp - a.timestamp),
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

const searchInput = ref('')
const filteredThreads = computed(() => {
  if (!searchInput.value)
    return threadsPartitioned.value[0]
  return threadsPartitioned.value[0].filter(thread =>
    thread.title.toLowerCase().includes(searchInput.value.toLowerCase()),
  )
})

function pinThread(thread: Doc<'threads'>) {
  pinnedThreadIds.value.push(thread._id)
  nextTick(() => { document.getElementById(`li_thread_${thread._id}`)?.scrollIntoView({ behavior: 'smooth' }) })
}

function unpinThread(thread: Doc<'threads'>) {
  pinnedThreadIds.value.splice(pinnedThreadIds.value.indexOf(thread._id), 1)
  nextTick(() => { document.getElementById(`li_thread_${thread._id}`)?.scrollIntoView({ behavior: 'smooth' }) })
}

async function _deleteThread(thread: Doc<'threads'>) {
  if (threadIdRef.value === thread._id)
    threadIdRef.value = ''

  threads.value.splice(threads.value.indexOf(thread), 1)
  await deleteThread(convex, { threadId: thread._id, lockerKey: $auth.loggedIn ? undefined : thread.lockerKey })
}

async function _shareThread(thread: Doc<'threads'>) {
  let lockerKey = thread.lockerKey
  if (!lockerKey) {
    const newLockerKey = getRandomLockerKey()
    await threadSetLockerKey(convex, { threadId: thread._id, newLockerKey })
    setLockerKey(thread._id, newLockerKey)
    lockerKey = newLockerKey
  }

  await copy(`${window.location.origin}/chat/${thread._id}?lockerKey=${lockerKey}`)
  toast({ description: t('chat.toast.threadShareLinkCopied') })
}

async function _freezeThread(thread: Doc<'threads'>) {
  const prevVal = thread.frozen
  thread.frozen = true

  await freezeThread(convex, { threadId: thread._id, lockerKey: thread.lockerKey })
    .catch(() => { thread.frozen = prevVal })
}

async function _unfreezeThread(thread: Doc<'threads'>) {
  const prevVal = thread.frozen
  thread.frozen = undefined

  await unfreezeThread(convex, { threadId: thread._id, lockerKey: thread.lockerKey })
    .catch(() => { thread.frozen = prevVal })
}

const [DefineDeleteBtn, ReuseDeleteBtn] = createReusableTemplate<{ thread: Doc<'threads'> }>()
const [DefineThreadLiItem, ReuseThreadLiItem] = createReusableTemplate<{ thread: Doc<'threads'>, pinned?: boolean }>()
</script>

<template>
  <Sidebar>
    <SidebarHeader class="px-4 py-2">
      <div class="absolute right-3 top-3">
        <Button
          variant="ghost" size="icon" class="size-7"
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
        <NuxtLink
          :to="{ name: 'chat-all' }"
          exact-active-class="[&>*]:(bg-accent/80! hover:bg-accent/100! active:bg-accent/60!)"
          @pointerdown="
            ++chatContext.interfaceSRK.value;
            (sidebarContext.isMobile.value && (sidebarContext.setOpenMobile(false), navigateTo(`/chat`)))
          "
        >
          <Button class="w-full" variant="outline" size="sm">
            {{ $t('chat.sidebar.newChat') }}
          </Button>
        </NuxtLink>
      </div>

      <ChatSidebarHeaderSearch v-model="searchInput" />
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
        <!-- Define some locally reusable items -->
        <div class="hidden">
          <DefineDeleteBtn v-slot="{ thread }">
            <DeleteThreadAlertDialog :thread :callback="() => { _deleteThread(thread) }">
              <Button tabindex="-1" variant="ghost" size="icon" class="size-7 transition-none">
                <div class="i-hugeicons:cancel-01" />
              </Button>
            </DeleteThreadAlertDialog>
          </DefineDeleteBtn>

          <DefineThreadLiItem v-slot="{ thread, pinned }">
            <li :id="`li_thread_${thread._id}`">
              <ContextMenu>
                <ContextMenuTrigger>
                  <!-- Using [&.active] instead of :active-class because of reactivity bug -->
                  <NuxtLink
                    :to="`/chat/${thread._id}`"
                    class="group/thread relative block flex items-center gap-2 overflow-hidden rounded-md p-2 px-3 text-sm [&.router-link-exact-active]:bg-primary/10 hover:bg-primary/20"
                    @mousedown.left="navigateTo(`/chat/${thread._id}`);"
                    @click="navigateTo(`/chat/${thread._id}`); sidebarContext.setOpenMobile(false)"
                  >
                    <div class="h-4 flex items-center gap-1">
                      <BranchIconButton v-if="thread.parentThread" :thread />
                      <FrozenIconButton v-if="thread.frozen" :thread />
                    </div>

                    <Tooltip :delay-duration="500">
                      <TooltipTrigger as-child>
                        <div class="truncate">
                          {{ thread.title }}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" :side-offset="6">
                        <p>{{ thread.title }}</p>
                      </TooltipContent>
                    </Tooltip>

                    <LiquidGlassDiv
                      class="right-0 top-0 h-full flex translate-x-[calc(100%+1rem)] items-center gap-1 px-2 pr-1 transition-transform will-change-transform $c-radius=6px absolute! group-hover/thread:translate-x-0"
                      @click.stop.prevent
                    >
                      <Tooltip :delay-duration="500">
                        <TooltipTrigger as-child>
                          <Button
                            tabindex="-1" variant="ghost" size="icon" class="size-7 transition-none hover:bg-surface-200/20!"
                            @pointerdown.stop.prevent @click.stop.prevent="pinned ? unpinThread(thread) : pinThread(thread)"
                          >
                            <div :class="[pinned ? 'i-hugeicons:pin-off' : 'i-hugeicons:pin']" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" :side-offset="6">
                          <p>{{ pinned ? $t('chat.thread.unpin') : $t('chat.thread.pin') }}</p>
                        </TooltipContent>
                      </Tooltip>

                      <ReuseDeleteBtn :thread />
                    </LiquidGlassDiv>
                  </NuxtLink>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    @click="pinned ? unpinThread(thread) : pinThread(thread)"
                  >
                    {{ pinned ? $t('chat.thread.unpin') : $t('chat.thread.pin') }}
                  </ContextMenuItem>
                  <ContextMenuItem @select.prevent>
                    <DeleteThreadAlertDialog :thread :callback="() => { _deleteThread(thread) }" :tip-only="true">
                      <p>{{ $t('chat.thread.delete') }}</p>
                    </DeleteThreadAlertDialog>
                  </ContextMenuItem>
                  <ContextMenuItem
                    @click="thread.frozen
                      ? _unfreezeThread(thread)
                      : _freezeThread(thread)"
                  >
                    {{ thread.frozen ? $t('chat.thread.unfreeze') : $t('chat.thread.freeze') }}
                  </ContextMenuItem>
                  <ContextMenuItem @select.prevent>
                    <ShareThreadAlertDialog :thread :callback="() => { _shareThread(thread) }" :tip-only="true">
                      <p>{{ $t('chat.thread.share') }}</p>
                    </ShareThreadAlertDialog>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
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
              <ChatSidebarUserMenuButton />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              class="w-[--reka-popper-anchor-width]"
            >
              <DropdownMenuItem class="justify-between" @click="chatContext.insaneUI.value = !chatContext.insaneUI.value">
                <div>InsaneUI</div>
                <div :class="chatContext.insaneUI.value ? ' i-hugeicons:crazy bg-mainGradient' : ' i-hugeicons:confused'" />
              </DropdownMenuItem>
              <GeneralSettingsSheet>
                <DropdownMenuItem class="justify-between" @select.prevent>
                  <div>{{ $t('settings') }}</div>
                  <div class="i-hugeicons:settings-01" />
                </DropdownMenuItem>
              </GeneralSettingsSheet>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
