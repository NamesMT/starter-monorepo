<script setup lang="ts">
import { api } from 'backend-convex/convex/_generated/api'

const toast = useToast()
const { $apiClient } = useNuxtApp()
const convexClient = useConvexClient()

const { data: tasks } = useConvexQuery(api.tasks.get)
const { mutate: mutateAddTask } = useConvexMutation(api.tasks.add)

const taskInputRef = ref('')

async function addTask() {
  await mutateAddTask({ text: taskInputRef.value })
    .then(() => { taskInputRef.value = '' })
}

const isFetching = ref(false)
async function testConvexViaBackendCTA() {
  isFetching.value = true

  await hcParse($apiClient.api.dummy.convex.$get())
    .then(r => toast.add({ detail: r.map(t => t.text).join('\n') }))
    .catch(e => toast.add({ severity: 'error', detail: e.message }))

  isFetching.value = false
}
</script>

<template>
  <div class="mb-4 text-xl">
    {{ $t('components.convexIntegrationTest.configuredUrl') }}: <code class="rounded bg-gray-100 px-1 py-0.5 text-base dark:bg-gray-800">{{ convexClient.client.url }}</code>
  </div>
  <div class="max-w-md w-full flex flex-col gap-5">
    <IftaLabel class="w-full">
      <label for="task-input" class="mb-1 block text-sm text-gray-700 font-medium dark:text-gray-300">{{ $t('components.convexIntegrationTest.addTask.label') }}:</label>
      <InputText id="task-input" v-model="taskInputRef" class="w-full" :placeholder="$t('components.convexIntegrationTest.addTask.placeholder')" @keydown.enter="addTask()" />
    </IftaLabel>
  </div>

  <div class="mt-6 max-w-md w-full">
    <h3 class="mb-2 text-lg font-semibold">
      {{ $t('components.convexIntegrationTest.tasksList.title') }}
    </h3>
    <ul v-if="tasks && tasks.length > 0" class="list-disc rounded-md bg-gray-50 p-3 pl-5 space-y-1 dark:bg-gray-800">
      <li v-for="task in tasks" :key="task._id" class="text-sm">
        {{ task.text }}
      </li>
    </ul>
    <p v-else class="text-sm text-gray-500 dark:text-gray-400">
      {{ $t('components.convexIntegrationTest.tasksList.empty') }}
    </p>
  </div>

  <Button :loading="isFetching" class="mt-8" :label="$t('components.convexIntegrationTest.testBackendButton')" @pointerdown="testConvexViaBackendCTA()" />
</template>
