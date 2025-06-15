export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  const threadIdRef = useThreadIdRef()

  const threadId = threadIdRef.value
  const lockerKey = to.query.lockerKey
  if (lockerKey && threadId) {
    if (getLockerKey(threadId) && to.query.force !== 'true')
      return console.error('Locker key already exists, add `&force=true` to overwrite')

    setLockerKey(threadId, String(to.query.lockerKey))
  }
})
