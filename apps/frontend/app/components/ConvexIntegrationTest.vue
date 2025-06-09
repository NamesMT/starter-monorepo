<script setup lang="ts">
import { api } from 'backend-convex/convex/_generated/api'

const convexClient = useConvexClient()

const { data: tasks } = useConvexQuery(api.tasks.get)
const { mutate: mutateAddTask } = useConvexMutation(api.tasks.add)

const taskInputRef = ref('')

async function addTask() {
  await mutateAddTask({ text: taskInputRef.value })
    .then(() => { taskInputRef.value = '' })
}
</script>

<template>
  <div class="text-xl">
    Convex configured: {{ convexClient.client.url }}
  </div>
  <div class="max-w-80vw w-80 flex flex-col gap-5">
    <IftaLabel>
      <label for="task-input">Add task entry (press enter):</label>
      <InputText id="task-input" v-model="taskInputRef" class="w-full" @keydown.enter="addTask()" />
    </IftaLabel>
  </div>

  <div>
    <div v-for="task, index of tasks" :key="index">
      {{ task.text }}
    </div>
  </div>
</template>
