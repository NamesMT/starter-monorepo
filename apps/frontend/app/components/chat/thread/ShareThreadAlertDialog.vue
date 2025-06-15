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
  callback,
  tipOnly,
} = defineProps<{
  thread: Doc<'threads'>
  callback: () => void
  tipOnly?: boolean
}>()

const { $auth } = useNuxtApp()
</script>

<template>
  <AlertDialog>
    <Tooltip :delay-duration="500">
      <AlertDialogTrigger v-show="!thread.userId || (thread.userId === $auth?.user?.sub)" as-child>
        <TooltipTrigger as-child @pointerdown.stop.prevent @click.shift.stop.prevent="callback()">
          <slot />
        </TooltipTrigger>
        <TooltipContent side="bottom" :side-offset="6">
          <p class="whitespace-pre-line text-center">
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
          {{ $t('chat.alert.shareThread.description', { name: thread.title }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="callback()">
          {{ $t('confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
