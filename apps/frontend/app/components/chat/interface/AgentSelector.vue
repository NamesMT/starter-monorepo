<script setup lang="ts">
const chatContext = useChatContext()
const enabledProviders = computed(() =>
  Object.entries(chatContext.agentsSettings.value.providers).filter(([_, v]) => v.enabled),
)

const activeAgentDisplay = computed(() => displayActiveAgent(chatContext.activeAgent.value))

// No Tooltip wrapper around the trigger: nesting `TooltipTrigger` and `DropdownMenuTrigger`,
// both `as-child`, merges two sets of pointer handlers onto the single Button, so the tooltip
// consumes the click and the menu never opens. Confirmed by A/B: it opens with the wrapper
// removed and not with it present. The model name is already visible on the button.
//
// The menu opens upward from a bottom-edge trigger, and the height cap keeps a long provider
// list scrollable instead of clipped.
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="sm" class="px-2 py-1 border-x-3px border-primary border-opacity-80 flex gap-1 h-fit w-40 items-center justify-between -ml-1.5 light:border-primary-600 hover:bg-accent/30">
        <div class="truncate">
          {{ activeAgentDisplay }}
        </div>
        <div class="i-hugeicons:arrow-up-01" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      side="top"
      class="max-h-[--reka-dropdown-menu-content-available-height] overflow-y-auto"
    >
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
  </DropdownMenu>
</template>
