<script setup lang="ts">
import { useChat } from '@ai-sdk/vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/lib/shadcn/components/ui/card'

const { $auth } = useNuxtApp()
const { convexApiUrl } = useRuntimeConfig().public

const { messages, input, handleSubmit } = useChat({
  api: `${convexApiUrl}/api/ai/chat`,
  headers: {
    Authorization: `Bearer ${$auth.token}`,
  },
})
</script>

<template>
  <div class="w-full flex justify-center">
    <div v-if="!$auth.loggedIn" class="h-full flex items-center justify-center text-xl">
      {{ $t('pages.chat.loginPrompt') }}
    </div>

    <div v-else class="max-w-6xl w-full flex flex-col p-4 space-y-4">
      <div class="flex-1 overflow-y-auto space-y-4">
        <div
          v-for="m, index in messages"
          :key="m.id ? m.id : index"
          class="flex"
          :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <Card class="max-w-md">
            <CardHeader>
              <CardTitle>{{ m.role === 'user' ? $t('pages.chat.userLabel') : $t('pages.chat.aiLabel') }}</CardTitle>
            </CardHeader>
            <CardContent>
              <div v-for="part, pIndex in m.parts" :key="pIndex">
                <div v-if="part.type === 'text'">
                  <p class="whitespace-pre-wrap">
                    {{ part.text }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div class="pt-4">
        <form class="mx-auto max-w-lg w-full flex gap-2" @submit="handleSubmit">
          <VanishingInput
            v-model="input"
            :placeholders="useInputThoughtsPlaceholders().value"
            @submit="handleSubmit()"
          />
        </form>
      </div>
    </div>
  </div>
</template>
