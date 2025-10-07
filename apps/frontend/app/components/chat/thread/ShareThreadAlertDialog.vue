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
import Button from '~/lib/shadcn/components/ui/button/Button.vue'
import { useToast } from '~/lib/shadcn/components/ui/toast'

const {
  thread,
  tipOnly,
} = defineProps<{
  thread: Doc<'threads'>
  tipOnly?: boolean
}>()

const { $auth } = useNuxtApp()
const convex = useConvexClient()
const { toast } = useToast()
const { t } = useI18n()
const { copy } = useClipboard({ legacy: true })

const open = ref(false)
const linkRef = ref('')

async function _shareThread() {
  if (!thread.lockerKey && !getLockerKey(thread._id)) {
    const newLockerKey = getRandomLockerKey()
    await threadSetLockerKey(convex, { threadId: thread._id, newLockerKey })
    setLockerKey(thread._id, newLockerKey)
  }

  linkRef.value = `${window.location.origin}/chat/${thread._id}?lockerKey=${getLockerKey(thread._id)}`
}

async function _shareCopyToast() {
  await _shareThread()
  await copy(`${window.location.origin}/chat/${thread._id}?lockerKey=${getLockerKey(thread._id)}`)
  toast({ description: t('chat.toast.threadShareLinkCopied') })
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <Tooltip>
      <AlertDialogTrigger v-show="!thread.userId || (thread.userId === $auth?.user?.id)" as-child>
        <TooltipTrigger
          as-child
          @pointerdown.stop.prevent
          @click.shift.stop.prevent="async () => { open = false; await _shareCopyToast() }"
        >
          <slot />
        </TooltipTrigger>
        <TooltipContent side="bottom" :side-offset="6">
          <p class="text-center whitespace-pre-line">
            {{ tipOnly
              ? $t('tip.holdShift')
              : `${$t('chat.thread.share')}\n${$t('tip.holdShift')}` }}
          </p>
        </TooltipContent>
      </AlertDialogTrigger>
    </Tooltip>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('chat.alert.shareThread.title') }}</AlertDialogTitle>
        <AlertDialogDescription class="whitespace-pre-line">
          {{
            !thread.userId
              ? $t('chat.alert.shareThread.descriptionDanger', { name: thread.title })
              : $t('chat.alert.shareThread.description', { name: thread.title })
          }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div v-show="linkRef" class="relative">
        <Input v-model="linkRef" disabled />
        <CodeCopy :code="linkRef" class="right-0 top-0 absolute hover:text-accent-foreground rounded-md! size-10! hover:bg-accent!" />
      </div>
      <AlertDialogFooter>
        <template v-if="!linkRef">
          <AlertDialogCancel>{{ $t('cancel') }}</AlertDialogCancel>
          <Button @click.exact="_shareThread()" @click.shift="_shareCopyToast(); open = false">
            {{ $t('confirm') }}
          </Button>
        </template>
        <AlertDialogAction v-else>
          {{ $t('close') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
