<script setup lang="ts">
const chatContext = useChatContext()
</script>

<template>
  <div class="hidden items-center right-3 top-3 absolute lg:flex">
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          variant="ghost" size="icon"
          class="size-7"
          @click="chatContext.insaneUI.value = !chatContext.insaneUI.value"
        >
          <div :class="chatContext.insaneUI.value ? ' i-hugeicons:crazy bg-mainGradient' : ' i-hugeicons:confused'" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" :side-offset="6">
        <p>InsaneUI</p>
      </TooltipContent>
    </Tooltip>
  </div>
</template>
