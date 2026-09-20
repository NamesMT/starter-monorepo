import type { ChatAttachment } from '@local/common/src/chat'
import type { Id } from 'backend-convex/convex/_generated/dataModel'
import type { ConvexClient } from 'convex/browser'
import { CHAT_ATTACHMENT_LIMITS, formatFileSize, matchesAttachmentAccept } from '@local/common/src/chat'
import { randomStr } from '@namesmt/utils'
import { api } from 'backend-convex/convex/_generated/api'

export type ChatAttachmentStatus = 'idle' | 'uploading' | 'uploaded' | 'error'

export interface ChatAttachmentItem {
  id: string
  file: File
  name: string
  type: string
  size: number
  /** Local object URL used for previews before the file is persisted. */
  previewUrl?: string
  status: ChatAttachmentStatus
  /** Upload progress in percent (0-100). */
  progress: number
  storageId?: string
  error?: string
}

export interface UploadAttachmentsArgs {
  convex: ConvexClient
  threadId: Id<'threads'>
  lockerKey?: string
  signal?: AbortSignal
}

const IMAGE_TYPE_PREFIX = 'image/'

/**
 * Manages the files staged in the composer: validation, previews, upload to Convex
 * file storage (with progress) and conversion to the persisted attachment shape.
 */
export function useChatAttachments() {
  const items = ref<ChatAttachmentItem[]>([])

  const hasAttachments = computed(() => items.value.length > 0)
  const isUploading = computed(() => items.value.some(item => item.status === 'uploading'))
  const hasErrors = computed(() => items.value.some(item => item.status === 'error'))
  const remainingSlots = computed(() => Math.max(0, CHAT_ATTACHMENT_LIMITS.maxCount - items.value.length))
  const canAddMore = computed(() => remainingSlots.value > 0)

  function revokePreview(item: ChatAttachmentItem) {
    if (item.previewUrl)
      URL.revokeObjectURL(item.previewUrl)
  }

  /**
   * Validates and stages files. Returns the reasons the rejected files were not added.
   */
  function addFiles(files: Iterable<File>, accept: readonly string[]) {
    const errors: string[] = []
    let slots = remainingSlots.value

    for (const file of files) {
      if (slots <= 0) {
        errors.push(`You can attach at most ${CHAT_ATTACHMENT_LIMITS.maxCount} files`)
        break
      }

      const type = file.type || 'application/octet-stream'

      if (file.size > CHAT_ATTACHMENT_LIMITS.maxFileSize) {
        errors.push(`"${file.name}" is larger than ${formatFileSize(CHAT_ATTACHMENT_LIMITS.maxFileSize)}`)
        continue
      }

      if (!matchesAttachmentAccept(type, file.name, accept)) {
        errors.push(`"${file.name}" is not an accepted file type`)
        continue
      }

      const item: ChatAttachmentItem = {
        id: `attachment-${Date.now()}_${randomStr(4)}`,
        file,
        name: file.name,
        type,
        size: file.size,
        status: 'idle',
        progress: 0,
      }

      if (type.startsWith(IMAGE_TYPE_PREFIX))
        item.previewUrl = URL.createObjectURL(file)

      items.value.push(item)
      slots--
    }

    return { errors }
  }

  function remove(id: string) {
    const index = items.value.findIndex(item => item.id === id)
    if (index === -1)
      return
    revokePreview(items.value[index]!)
    items.value.splice(index, 1)
  }

  function clear() {
    for (const item of items.value)
      revokePreview(item)
    items.value = []
  }

  /**
   * Detaches every staged item without revoking its preview URL.
   *
   * Ownership of the local object URLs transfers to the caller, which should revoke
   * them once server-provided URLs replace them (e.g. after the message is reconciled).
   */
  function takeAll() {
    const taken = items.value
    items.value = []
    return taken
  }

  /**
   * Uploads every staged file that does not already have a storage id.
   *
   * Resolves with the persisted attachment metadata, or throws after marking the
   * failing items if any upload failed (successful items keep their storage id so a
   * retry does not re-upload them).
   */
  async function uploadAll({ convex, threadId, lockerKey, signal }: UploadAttachmentsArgs) {
    for (const item of items.value) {
      if (item.status === 'uploaded' && item.storageId)
        continue

      item.status = 'uploading'
      item.progress = 0
      item.error = undefined

      try {
        const uploadUrl = await convex.mutation(api.files.generateUploadUrl, { threadId, lockerKey })
        const attachment = await uploadChatAttachment({
          uploadUrl,
          file: item.file,
          signal,
          onProgress: (progress) => { item.progress = progress },
        })
        item.storageId = attachment.storageId
        item.type = attachment.type
        item.status = 'uploaded'
        item.progress = 100
      }
      catch (error) {
        item.status = 'error'
        item.error = (error as Error).message || 'Upload failed'
      }
    }

    const failed = items.value.filter(item => item.status === 'error')
    if (failed.length)
      throw new Error(failed.map(item => item.error).filter(Boolean).join('\n') || 'Some attachments failed to upload')

    return items.value
      .filter(item => item.status === 'uploaded' && item.storageId)
      .map<ChatAttachment>(item => ({
        storageId: item.storageId!,
        name: item.name,
        type: item.type,
        size: item.size,
      }))
  }

  // Release any staged preview URLs when the owning scope is disposed.
  onScopeDispose(() => clear())

  return {
    items,
    hasAttachments,
    isUploading,
    hasErrors,
    canAddMore,
    remainingSlots,
    addFiles,
    remove,
    clear,
    takeAll,
    uploadAll,
  }
}

export type ChatAttachmentManager = ReturnType<typeof useChatAttachments>
