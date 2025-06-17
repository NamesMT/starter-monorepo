import { randomStr } from '@namesmt/utils'

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

  const lSNickname = localStorage.getItem('chat/user-nickname')
  const parsedlSNickname = lSNickname ? JSON.parse(lSNickname) : undefined

  return parsedlSNickname.trim() ? parsedlSNickname : $auth?.user?.name || 'Anonymous'
}

export function getChatFallbackNickname() {
  const { $auth } = useNuxtApp()
  return $auth?.user?.name || 'Anonymous'
}
