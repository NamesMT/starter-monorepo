import { randomStr } from '@namesmt/utils'
import { destr } from 'destr'

export function getRandomLockerKey() {
  return `locker_${Date.now()}_${randomStr(8)}`
}

export function setLockerKey(kid: string, lockerKey: string) {
  localStorage.setItem(`locker_${kid}`, lockerKey)
}

export function getLockerKey(kid: string) {
  return localStorage.getItem(`locker_${kid}`) ?? undefined
}

export function useChatNickname() {
  return useLocalState<string>(`chat/user-nickname`, () => '')
}

export function getChatNickname() {
  const { $auth } = useNuxtApp()

  const lSNickname = destr<string>(localStorage.getItem('chat/user-nickname') ?? '').trim()

  return lSNickname || $auth?.user?.fullName || 'Anonymous'
}

export function getChatFallbackNickname() {
  const { $auth } = useNuxtApp()
  return $auth?.user?.fullName || 'Anonymous'
}
