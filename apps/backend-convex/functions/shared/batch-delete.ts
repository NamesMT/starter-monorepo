import type { MutationCtx } from '../../convex/_generated/server'

/** Convex's per-transaction ceilings; the helper stops well inside them. */
const BYTES_READ_BUDGET = 4 * 1024 * 1024
const DOCUMENTS_WRITTEN_BUDGET = 2 * 1024 * 1024
const DOCUMENTS_READ_HEADROOM = 500

/**
 * Deletes rows in one pass while leaving transaction budget for the caller, returning how
 * many are left.
 *
 * `.collect()` before deleting is the trap: Convex caps a transaction at 16 MiB read,
 * 32,000 documents scanned and 16 MiB written, so a table that outgrows those limits makes
 * the mutation throw and delete *nothing* — including the daily wipes, which are the demo's
 * cost control. Iterating keeps only one document in memory at a time, and the caller
 * reschedules while work remains.
 *
 * `iterate` must be stable across passes (an index or table order does not change as rows are
 * deleted from it).
 */
export async function deleteInBatches<T extends { _id: any }>(
  ctx: MutationCtx,
  iterate: AsyncIterable<T>,
): Promise<{ deleted: number, remaining: number }> {
  let deleted = 0

  for await (const doc of iterate) {
    await ctx.db.delete(doc._id)
    deleted++

    // Check headroom every batch rather than per document: the call itself is cheap but not
    // free, and the point is to stop before the ceiling, not to track it exactly.
    if (deleted % 100 === 0) {
      const metrics = await ctx.meta.getTransactionMetrics()
      if (
        metrics.bytesRead.used > BYTES_READ_BUDGET
        || metrics.bytesWritten.used > DOCUMENTS_WRITTEN_BUDGET
        || metrics.documentsRead.remaining < DOCUMENTS_READ_HEADROOM
      ) {
        return { deleted, remaining: 1 }
      }
    }
  }

  return { deleted, remaining: 0 }
}
