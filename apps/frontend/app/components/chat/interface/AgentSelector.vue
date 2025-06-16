<script setup lang="ts">
const chatContext = useChatContext()
const activeAgentDisplay = computed(() => displayActiveAgent(chatContext.activeAgent.value))
</script>

<template>
  <DropdownMenu>
    <Tooltip :delay-duration="500">
      <TooltipTrigger as-child>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" class="h-fit w-40 flex items-center justify-between gap-1 border-x border-primary border-opacity-80 px-2 py-1 -ml-1.5 light:border-primary-600 hover:bg-accent/30">
            <div class="truncate">
              {{ activeAgentDisplay }}
            </div>
            <div class="i-hugeicons:arrow-up-01" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>{{ $t('chat.provider.hosted') }}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-for="[model] of Object.entries(chatContext.hostedProvider.value.models).filter((([_m, v]) => v.enabled))"
            :key="model"
            @click="chatContext.agentsSetting.value.selectedAgent = `hosted/${model}`"
          >
            {{ model }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </TooltipTrigger>
      <TooltipContent side="bottom" :side-offset="6">
        <p>{{ activeAgentDisplay }}</p>
      </TooltipContent>
    </Tooltip>
  </DropdownMenu>
</template>
