<script setup lang="ts">
import { api } from 'backend-convex/convex/_generated/api'
import { useToast } from '~/lib/shadcn/components/ui/toast'

const { toast } = useToast()
const { $apiClient } = useNuxtApp()
const convexClient = useConvexClient()

const { data: tasks } = useConvexQuery(api.tasks.get)
const { data: authInfo } = useConvexQuery(api.authInfo.get)
const { mutate: mutateAddTask } = useConvexMutation(api.tasks.add)

const taskInputRef = ref('')
async function addTask() {
  await mutateAddTask({ text: taskInputRef.value })
    .catch((e) => { toast({ variant: 'destructive', description: getConvexErrorMessage(e) }) })
    .then(() => {
      taskInputRef.value = ''
    })
}

const isFetchingTasks = ref(false)
async function testConvexViaBackendTasksCTA() {
  isFetchingTasks.value = true

  await hcParse($apiClient.api.dummy.convexTasks.$get())
    .then(r => toast({ description: r.map(t => t.text).join('\n') }))
    .catch(e => toast({ variant: 'destructive', description: e.message }))

  isFetchingTasks.value = false
}
</script>

<template>
  <div class="mb-4 w-full text-xl">
    <div>
      {{ $t('components.convexIntegrationTest.configuredUrl') }}: <code
        class="rounded bg-gray-100 px-1 py-0.5 text-base dark:bg-gray-800"
      >{{ convexClient.client.url }}</code>
    </div>
    <div>
      {{ $t('components.convexIntegrationTest.authenticated') }}: <code
        class="rounded bg-gray-100 px-1 py-0.5 text-base dark:bg-gray-800"
      >{{ Boolean(authInfo) }}</code>
    </div>
  </div>
  <div class="max-w-md w-full flex flex-col gap-5">
    <VanishingInput
      v-model="taskInputRef"
      :placeholders="getThoughtPlaceholders()"
      @submit="addTask()"
    />
  </div>

  <div class="max-w-md w-full">
    <h3 class="mb-2 text-lg font-semibold">
      {{ $t('components.convexIntegrationTest.tasksList.title') }}
    </h3>
    <ul
      v-if="tasks && tasks.length > 0"
      class="list-disc rounded-md bg-gray-50 p-3 pl-5 text-left space-y-1 dark:bg-gray-800"
    >
      <li v-for="task in tasks" :key="task._id" class="text-sm">
        {{ task.text }}
      </li>
    </ul>
    <p v-else class="text-sm text-gray-500 dark:text-gray-400">
      {{ $t('components.convexIntegrationTest.tasksList.empty') }}
    </p>
  </div>

  <div class="my-8 flex flex-col gap-4">
    <Button :loading="isFetchingTasks" @pointerdown="testConvexViaBackendTasksCTA()">
      {{ $t('components.convexIntegrationTest.testBackendButton.fetchTasks') }}
    </Button>
  </div>
</template>
