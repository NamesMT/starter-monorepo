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

export function getChatNickname() {
  const { $auth } = useNuxtApp()

  return localStorage.getItem('chat/user-nickname') || $auth?.user?.name || 'Anonymous'
}

export function setChatNickname(nickname: string | undefined) {
  if (nickname === undefined)
    localStorage.removeItem('chat/user-nickname')
  else
    localStorage.setItem('chat/user-nickname', nickname)
}
