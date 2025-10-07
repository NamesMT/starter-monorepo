<script setup lang="ts">
const chatContext = useChatContext()
const enabledProviders = computed(() =>
  Object.entries(chatContext.agentsSettings.value.providers).filter(([_, v]) => v.enabled),
)

const activeAgentDisplay = computed(() => displayActiveAgent(chatContext.activeAgent.value))
</script>

<template>
  <DropdownMenu>
    <Tooltip>
      <TooltipTrigger as-child>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" class="px-2 py-1 border-x-3px border-primary border-opacity-80 flex gap-1 h-fit w-40 items-center justify-between -ml-1.5 light:border-primary-600 hover:bg-accent/30">
            <div class="truncate">
              {{ activeAgentDisplay }}
            </div>
            <div class="i-hugeicons:arrow-up-01" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>{{ $t('chat.provider.hosted') }}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <AgentSelectorModelItem
            v-for="[model, modelSettings] of Object.entries(chatContext.hostedProvider.value.models).filter((([_m, v]) => v.enabled))"
            :key="model"
            v-bind="{ provider: 'hosted', model, modelSettings }"
          />
          <template v-for="[provider, providerSettings] of enabledProviders" :key="provider">
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{{ $t(`chat.provider.${provider}`) }}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <AgentSelectorModelItem
              v-for="[model, modelSettings] of Object.entries(providerSettings.models).filter((([_m, v]) => v.enabled))"
              :key="model"
              v-bind="{ provider, model, modelSettings }"
            />
          </template>
        </DropdownMenuContent>
      </TooltipTrigger>
      <TooltipContent side="bottom" :side-offset="6">
        <p>{{ activeAgentDisplay }}</p>
      </TooltipContent>
    </Tooltip>
  </DropdownMenu>
</template>
