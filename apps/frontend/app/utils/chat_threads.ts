import type { Id } from 'backend-convex/convex/_generated/dataModel'
import type { ConvexClient, ConvexHttpClient } from 'convex/browser'
import { api } from 'backend-convex/convex/_generated/api'

export interface refreshThreadArgs {
  threadId: Id<'threads'>
  chatContext: ChatContext
}
export async function refreshThread(convex: ConvexClient | ConvexHttpClient, { threadId, chatContext }: refreshThreadArgs) {
  await convex.query(api.threads.get, { threadId, lockerKey: getLockerKey(threadId) })
    .then((res) => {
      const foundLocallyAt = chatContext.threads.value.findIndex(t => t._id === threadId)
      if (foundLocallyAt !== -1)
        Object.assign(chatContext.threads.value[foundLocallyAt]!, convex.query(api.threads.get, { threadId, lockerKey: getLockerKey(threadId) }))
      else
        chatContext.threads.value.push(res)
    })
    .catch((e) => {
      if (getConvexErrorMessage(e) === 'Thread not found') {
        const foundLocallyAt = chatContext.threads.value.findIndex(t => t._id === threadId)
        if (foundLocallyAt !== -1)
          chatContext.threads.value.splice(foundLocallyAt, 1)
      }
    })
}

export interface BranchThreadFromMessageArgs {
  messageId: Id<'messages'>
  sessionId?: string
  lockerKey?: string
}
export async function branchThreadFromMessage(convex: ConvexClient | ConvexHttpClient, {
  messageId,
  sessionId,
  lockerKey,
}: BranchThreadFromMessageArgs) {
  const { $init } = useNuxtApp()

  return await convex.mutation(api.threads.branchThreadFromMessage, {
    messageId,
    sessionId: sessionId ?? $init.sessionId,
    lockerKey,
  })
}

export interface CreateNewThreadArgs {
  title: string
  lockerKey?: string
}
export async function createNewThread(convex: ConvexClient | ConvexHttpClient, {
  title,
  lockerKey,
}: CreateNewThreadArgs) {
  const { $init } = useNuxtApp()

  return await convex.mutation(api.threads.create, {
    title,
    sessionId: $init.sessionId,
    lockerKey,
  })
}

export interface DeleteThreadArgs {
  threadId: Id<'threads'>
  lockerKey?: string
}
export async function deleteThread(convex: ConvexClient | ConvexHttpClient, {
  threadId,
  lockerKey,
}: DeleteThreadArgs) {
  await convex.mutation(api.threads.del, {
    threadId,
    lockerKey,
  })
}

export interface FreezeThreadArgs {
  threadId: Id<'threads'>
  lockerKey?: string
}
export async function freezeThread(convex: ConvexClient | ConvexHttpClient, { threadId, lockerKey }: FreezeThreadArgs) {
  return await convex.mutation(api.threads.freeze, {
    threadId,
    lockerKey,
  })
}

export interface UnfreezeThreadArgs {
  threadId: Id<'threads'>
  lockerKey?: string
}
export async function unfreezeThread(convex: ConvexClient | ConvexHttpClient, { threadId, lockerKey }: UnfreezeThreadArgs) {
  return await convex.mutation(api.threads.unfreeze, {
    threadId,
    lockerKey,
  })
}

export interface MigrateThreadToUserArgs {
  threadId: Id<'threads'>
  lockerKey?: string
}
export async function migrateThreadToUser(convex: ConvexClient | ConvexHttpClient, { threadId, lockerKey }: MigrateThreadToUserArgs) {
  return await convex.mutation(api.threads.migrateToUser, {
    threadId,
    lockerKey,
  })
}

export interface GenerateThreadTitleArgs {
  threadId: Id<'threads'>
  lockerKey?: string
}
export async function generateThreadTitle(convex: ConvexClient | ConvexHttpClient, {
  threadId,
  lockerKey,
}: GenerateThreadTitleArgs) {
  await convex.action(api.threads.generateTitle, {
    threadId,
    lockerKey,
  })
}

export interface ThreadSetLockerKeyArgs {
  threadId: Id<'threads'>
  newLockerKey: string
}
export async function threadSetLockerKey(convex: ConvexClient | ConvexHttpClient, {
  threadId,
  newLockerKey,
}: ThreadSetLockerKeyArgs) {
  await convex.mutation(api.threads.setLockerKey, {
    threadId,
    newLockerKey,
  })
}
