import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { api } from 'backend-convex/convex/_generated/api'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  // Route middleware runs before the navigation is committed, so `useRoute()` (and
  // therefore `useThreadIdRef()`) can still point at the previous route. Read the
  // target params instead.
  const routeAll = to.params.all
  const threadId = (Array.isArray(routeAll) ? routeAll[0] : routeAll) as Id<'threads'> | undefined
  const lockerKey = to.query.lockerKey?.toString()

  if (!threadId || !lockerKey)
    return

  if (getLockerKey(threadId) && to.query.force !== 'true') {
    console.error('Locker key already exists, add `&force=true` to overwrite')
    return
  }

  const convex = useConvexClient()
  const { data: threads, isFinished } = useIDBKeyval<Doc<'threads'>[]>('chat/threads', [])

  try {
    const thread = await convex.query(api.threads.get, { threadId, lockerKey })

    await until(isFinished).toBeTruthy()

    const existingThread = threads.value.find(t => t._id === threadId)
    if (existingThread)
      Object.assign(existingThread, thread)
    else
      threads.value.unshift(thread)

    setLockerKey(threadId, lockerKey)
  }
  catch (error) {
    console.error('Failed to accept the shared thread:', error)
  }
})
