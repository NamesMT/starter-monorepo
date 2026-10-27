import type { MutationCtx } from '../../convex/_generated/server'

/** Stop well inside Convex's per-transaction ceilings. */
const BYTES_READ_BUDGET = 4 * 1024 * 1024
const BYTES_WRITTEN_BUDGET = 2 * 1024 * 1024
const DOCUMENTS_READ_HEADROOM = 500

/**
 * Deletes rows from `iterate`, stopping while transaction budget remains, and reports whether
 * work is left. Iterating rather than `.collect()`ing keeps a large table from exceeding the
 * transaction limits, which would throw and delete nothing.
 *
 * `iterate` must stay stable across passes.
 */
export async function deleteInBatches<T extends { _id: any }>(
  ctx: MutationCtx,
  iterate: AsyncIterable<T>,
): Promise<{ deleted: number, remaining: number }> {
  let deleted = 0

  for await (const doc of iterate) {
    await ctx.db.delete(doc._id)
    deleted++

    if (deleted % 100 === 0) {
      const metrics = await ctx.meta.getTransactionMetrics()
      if (
        metrics.bytesRead.used > BYTES_READ_BUDGET
        || metrics.bytesWritten.used > BYTES_WRITTEN_BUDGET
        || metrics.documentsRead.remaining < DOCUMENTS_READ_HEADROOM
      ) {
        return { deleted, remaining: 1 }
      }
    }
  }

  return { deleted, remaining: 0 }
}
