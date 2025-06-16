<script setup lang="ts">
const emit = defineEmits<{
  confirm: []
}>()
const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('chat.multiStreamConfirmDialog.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('chat.multiStreamConfirmDialog.description') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="emit('confirm')">
          {{ $t('continue') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
