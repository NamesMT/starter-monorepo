<script setup lang="ts">
const { $auth } = useNuxtApp()

const nicknameRef = useChatNickname()
</script>

<template>
  <SidebarMenuButton class="flex h-auto w-full items-center justify-between">
    <div class="text-sm leading-tight flex gap-2 h-9 truncate items-center">
      <template v-if="$auth.loggedIn">
        <Avatar shape="square" size="sm" class="size-9" alt="User avatar">
          <AvatarImage v-if="$auth.user.avatar" :src="$auth.user.avatar" alt="Avatar image" />
          <AvatarFallback>👤</AvatarFallback>
        </Avatar>
        <div class="truncate">
          <p>{{ $auth.user.fullName }} <span v-show="nicknameRef" aria-label="User nickname" class="text-xs">({{ nicknameRef || getChatFallbackNickname() }})</span></p>
          <p class="text-xs truncate">
            {{ $auth.user.email }}
          </p>
        </div>
      </template>
      <template v-else>
        <Avatar shape="square" size="sm" class="size-9" alt="Guest placeholder avatar">
          <AvatarFallback>🍳</AvatarFallback>
        </Avatar>
        <div class="truncate">
          <p>{{ $t('guest') }} <span aria-label="User nickname" class="text-xs">({{ nicknameRef || getChatFallbackNickname() }})</span></p>
          <p class="text-xs truncate">
            {{ $t('loginToEnjoyMore') }}
          </p>
        </div>
      </template>
    </div>
    <div class="i-hugeicons:dashboard-square-setting shrink-0 size-5" />
  </SidebarMenuButton>
</template>
