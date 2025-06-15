import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { api } from 'backend-convex/convex/_generated/api'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  const threadIdRef = useThreadIdRef()

  const threadId = threadIdRef.value as Id<'threads'>
  const lockerKey = to.query.lockerKey?.toString()
  if (lockerKey && threadId) {
    if (getLockerKey(threadId) && to.query.force !== 'true')
      return console.error('Locker key already exists, add `&force=true` to overwrite')

    const convex = useConvexClient()
    const { data: threads, isFinished } = useIDBKeyval<Doc<'threads'>[]>('chat/threads', [])
    const thread = await convex.query(api.threads.get, { threadId, lockerKey })

    await until(isFinished).toBeTruthy()

    const existingThread = threads.value.find(t => t._id === threadId)
    if (existingThread)
      Object.assign(existingThread, thread)
    else
      threads.value.unshift(thread)

    setLockerKey(threadId, String(to.query.lockerKey))
  }
})
