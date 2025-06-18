<script setup lang="ts">
const chatContext = useChatContext()

const keys = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'O')
      e.preventDefault()
  },
})

whenever(keys['Ctrl+Shift+O']!, () => {
  navigateTo('/chat')
  ++chatContext.interfaceSRK.value
})
</script>
