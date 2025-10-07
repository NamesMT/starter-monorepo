<script setup lang="ts">
import type { Doc } from 'backend-convex/convex/_generated/dataModel'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/lib/shadcn/components/ui/tooltip'

const {
  thread,
  tipOnly,
} = defineProps<{
  thread: Doc<'threads'>
  tipOnly?: boolean
}>()

const { $auth } = useNuxtApp()
const convex = useConvexClient()
const threadIdRef = useThreadIdRef()
const { threads } = useChatContext()

async function _deleteThread() {
  if (threadIdRef.value === thread._id)
    threadIdRef.value = ''

  threads.value.splice(threads.value.indexOf(thread), 1)
  await deleteThread(convex, { threadId: thread._id, lockerKey: $auth.loggedIn ? undefined : getLockerKey(thread._id) })
}
</script>

<template>
  <AlertDialog>
    <Tooltip>
      <AlertDialogTrigger v-show="!thread.userId || (thread.userId === $auth?.user?.id)" as-child>
        <TooltipTrigger as-child @pointerdown.stop.prevent @click.shift.stop.prevent="_deleteThread()">
          <slot />
        </TooltipTrigger>
        <TooltipContent side="bottom" :side-offset="6">
          <p class="text-center whitespace-pre-line">
            {{ tipOnly
              ? $t('tip.holdShift')
              : `${$t('chat.thread.delete')}\n${$t('tip.holdShift')}` }}
          </p>
        </TooltipContent>
      </AlertDialogTrigger>
    </Tooltip>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('chat.alert.deleteThread.title') }}</AlertDialogTitle>
        <AlertDialogDescription class="whitespace-pre-line">
          {{ $t('chat.alert.deleteThread.description', { name: thread.title }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="_deleteThread()">
          {{ $t('confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
