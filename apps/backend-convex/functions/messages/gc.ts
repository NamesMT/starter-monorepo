import { v } from 'convex/values'
import { internal } from '../../convex/_generated/api'
import { internalMutation } from '../../convex/_generated/server'

/**
 * How long a stored file is left alone before it can be reclaimed.
 *
 * An upload is two steps from the client's side: `generateUploadUrl` then the actual upload,
 * and only then is the `storageId` persisted onto a message. A sweep that ran immediately
 * could delete a blob that was uploaded seconds ago but not yet attached, so anything younger
 * than this is skipped. Generous on purpose — the cost of keeping a blob an extra hour is
 * trivial next to deleting one that was about to be referenced.
 */
export const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000

/** How many blobs one pass deletes before rescheduling, to stay inside transaction limits. */
const BATCH_SIZE = 100

/**
 * Finds the ids collected by the caller-provided set minus those still referenced.
 *
 * Pure so the "what counts as an orphan" decision is testable without a deployment: the sweep
 * itself is only storage bookkeeping around this.
 */
export function selectOrphans(
  stored: readonly { _id: string, _creationTime: number }[],
  referenced: ReadonlySet<string>,
  now: number,
  minAgeMs: number = ORPHAN_MIN_AGE_MS,
): string[] {
  return stored
    .filter(file => !referenced.has(file._id))
    .filter(file => now - file._creationTime >= minAgeMs)
    .map(file => file._id)
}

/**
 * Reclaims stored files no message references any more.
 *
 * Deleting a thread or a message removes the database rows but not the blobs they pointed at,
 * and the daily demo cron wipes every thread and message. Without this sweep every attachment
 * ever uploaded would be orphaned permanently and still billed.
 *
 * Batched and self-rescheduling: a deployment can hold far more files than one mutation may
 * delete, and `_storage` has no index to iterate in place.
 */
export const clearOrphanedAttachments = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? BATCH_SIZE
    const now = Date.now()

    const referenced = new Set<string>()
    for (const message of await ctx.db.query('messages').collect()) {
      for (const attachment of message.attachments ?? [])
        referenced.add(attachment.storageId)
    }

    // A user message is written with its attachments in the same turn, but the blob is
    // uploaded first, so only messages are a source of references.
    const stored = await ctx.db.system.query('_storage').collect()
    const orphans = selectOrphans(stored, referenced, now)

    const batch = orphans.slice(0, limit)
    for (const storageId of batch)
      await ctx.storage.delete(storageId as any)

    const remaining = orphans.length - batch.length
    if (remaining > 0)
      await ctx.scheduler.runAfter(0, internal.messages.clearOrphanedAttachments, { limit })

    return { deleted: batch.length, remaining }
  },
})
