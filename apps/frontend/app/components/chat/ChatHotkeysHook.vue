<script setup lang="ts">
import { useChatGlobalsContext } from './ChatGlobalsProvider.vue'

const chatContext = useChatContext()
const chatGlobalsContext = useChatGlobalsContext()

const keys = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'O')
      e.preventDefault()
    if (e.ctrlKey && e.key === 'g')
      e.preventDefault()
  },
})

whenever(keys['Ctrl+Shift+O']!, () => {
  navigateTo('/chat')
  ++chatContext.interfaceSRK.value
})

whenever(keys['Ctrl+g']!, () => {
  chatGlobalsContext.generalSettingsOpen.value = !chatGlobalsContext.generalSettingsOpen.value
})
</script>
