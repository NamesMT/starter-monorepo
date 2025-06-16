<script setup lang="ts">
const { $auth } = useNuxtApp()

const nicknameRef = useChatNickname()
</script>

<template>
  <SidebarMenuButton class="h-auto w-full flex items-center justify-between">
    <div class="h-9 flex items-center gap-2 truncate text-sm leading-tight">
      <template v-if="$auth.loggedIn">
        <Avatar shape="square" size="sm" class="size-9" alt="User avatar">
          <AvatarImage :src="$auth.user.picture" alt="Avatar image" />
          <AvatarFallback>👤</AvatarFallback>
        </Avatar>
        <div class="truncate">
          <p>{{ $auth.user.name }} <span class="text-xs">({{ nicknameRef || getChatFallbackNickname() }})</span></p>
          <p class="truncate text-xs">
            {{ $auth.user.email }}
          </p>
        </div>
      </template>
      <template v-else>
        <Avatar shape="square" size="sm" class="size-9" alt="Guest placeholder avatar">
          <AvatarFallback>🍳</AvatarFallback>
        </Avatar>
        <div class="truncate">
          <p>{{ $t('guest') }} <span class="text-xs">({{ nicknameRef || getChatFallbackNickname() }})</span></p>
          <p class="truncate text-xs">
            {{ $t('loginToEnjoyMore') }}
          </p>
        </div>
      </template>
    </div>
    <div class="i-hugeicons:dashboard-square-setting size-5 shrink-0" />
  </SidebarMenuButton>
</template>
