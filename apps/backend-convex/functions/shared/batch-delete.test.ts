import { describe, expect, it } from 'vitest'
import { deleteInBatches } from './batch-delete'

/**
 * The deletion helpers are the difference between a sweep that works and one that silently
 * does nothing: a mutation that exceeds Convex's read/write ceilings throws and rolls back, so
 * a `.collect()`-then-delete stops deleting entirely once the table is large enough.
 *
 * A deployment is not available here, so these drive the helper with a stand-in `ctx` that
 * reports shrinking transaction headroom, exactly as Convex does.
 */
function makeCtx(totalDocs: number, opts: { budgetDocs?: number } = {}) {
  // Convex reports remaining headroom for *this* transaction; the helper must stop by reading
  // it, not by the iterator running dry. `budgetDocs` is that remaining ceiling.
  const budgetDocs = opts.budgetDocs ?? totalDocs + 500
  const deleted: number[] = []
  let reads = 0

  const ctx = {
    db: {
      async delete(id: number) {
        deleted.push(id)
      },
    },
    meta: {
      async getTransactionMetrics() {
        return {
          bytesRead: { used: 0, remaining: 16 * 1024 * 1024 },
          bytesWritten: { used: 0, remaining: 16 * 1024 * 1024 },
          databaseQueries: { used: 0, remaining: 4096 },
          documentsRead: { used: reads, remaining: Math.max(0, budgetDocs - reads) },
          documentsWritten: { used: deleted.length, remaining: 16000 - deleted.length },
          functionsScheduled: { used: 0, remaining: 1000 },
          scheduledFunctionArgsBytes: { used: 0, remaining: 4 * 1024 * 1024 },
        }
      },
    },
  }

  // Yields every row, like a real query: stopping is the helper's job, and a mutation that
  // overruns would throw rather than return.
  async function* iterate() {
    for (let i = 0; i < totalDocs; i++) {
      reads++
      yield { _id: i }
    }
  }

  return { ctx, iterate, deleted }
}

describe('deleteInBatches', () => {
  it('deletes every row and reports nothing remaining for a small table', async () => {
    const { ctx, iterate, deleted } = makeCtx(50)

    const result = await deleteInBatches(ctx as any, iterate())

    expect(result).toEqual({ deleted: 50, remaining: 0 })
    expect(deleted).toHaveLength(50)
  })

  it('stops with work remaining instead of running into the transaction ceiling', async () => {
    // More docs than the pass may read: the helper must stop and let the caller reschedule
    // rather than throw, which would roll back every delete it already did.
    const { ctx, iterate } = makeCtx(5000, { budgetDocs: 900 })

    const result = await deleteInBatches(ctx as any, iterate())

    expect(result.remaining).toBe(1)
    expect(result.deleted).toBeGreaterThan(0)
    expect(result.deleted).toBeLessThan(5000)
  })

  it('keeps draining across passes, so a rescheduled sweep eventually finishes', async () => {
    let left = 2500
    let passes = 0

    while (left > 0 && passes < 50) {
      const { ctx, iterate, deleted } = makeCtx(left, { budgetDocs: 900 })
      const result = await deleteInBatches(ctx as any, iterate())
      left -= result.deleted
      passes++
      if (!deleted.length && result.remaining)
        throw new Error('made no progress but claimed work remains')
    }

    expect(left).toBe(0)
  })
})
