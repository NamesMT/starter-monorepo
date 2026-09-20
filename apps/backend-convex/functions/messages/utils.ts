import type { GenericQueryCtx } from 'convex/server'
import type { Doc } from '../../convex/_generated/dataModel'

/**
 * An attachment as sent to clients: persisted metadata plus a resolved, directly
 * usable URL (or `null` if the underlying file has been removed).
 */
export type ResolvedAttachment = NonNullable<Doc<'messages'>['attachments']>[number] & {
  url: string | null
}

export type MessageWithResolvedAttachments = Omit<Doc<'messages'>, 'attachments'> & {
  attachments?: ResolvedAttachment[]
}

/**
 * Resolves the Convex storage URL for every attachment on a message so clients can
 * render them without extra round-trips.
 */
export async function resolveMessageAttachments(ctx: GenericQueryCtx<any>, message: Doc<'messages'>): Promise<MessageWithResolvedAttachments> {
  if (!message.attachments?.length)
    return message as MessageWithResolvedAttachments

  const attachments = await Promise.all(message.attachments.map(async attachment => ({
    ...attachment,
    url: await ctx.storage.getUrl(attachment.storageId),
  })))

  return { ...message, attachments }
}
