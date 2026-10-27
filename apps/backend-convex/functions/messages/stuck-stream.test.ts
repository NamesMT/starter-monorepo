import { describe, expect, it } from 'vitest'
import { isStuckStream, livenessFor } from './internal'

/**
 * The sweep used to compare the *creation* time against a ten-minute cutoff, and `timestamp`
 * never moves — so a generation that legitimately streamed for longer was force-finished with
 * "Streaming timed out" while the action was still writing parts to it.
 */
describe('isStuckStream', () => {
  const TEN_MINUTES = 10 * 60 * 1000
  const now = 1_800_000_000_000
  const cutoff = now - TEN_MINUTES

  it('leaves a long-running stream alone while it keeps making progress', () => {
    // Created an hour ago, last saved seconds ago: healthy, not stuck.
    expect(isStuckStream({ timestamp: now - 60 * 60 * 1000, lastActivityAt: now - 5_000 }, cutoff)).toBe(false)
  })

  it('reclaims a stream that has gone silent past the cutoff', () => {
    expect(isStuckStream({ timestamp: now - 60 * 60 * 1000, lastActivityAt: now - TEN_MINUTES - 1 }, cutoff)).toBe(true)
  })

  it('falls back to the creation time for rows written before lastActivityAt existed', () => {
    expect(isStuckStream({ timestamp: now - TEN_MINUTES - 1 }, cutoff)).toBe(true)
    expect(isStuckStream({ timestamp: now - 1_000 }, cutoff)).toBe(false)
  })

  it('treats the cutoff itself as stuck, so the boundary cannot stall a sweep', () => {
    expect(isStuckStream({ timestamp: 0, lastActivityAt: cutoff }, cutoff)).toBe(true)
  })
})

/**
 * The periodic save that runs while a reply streams passes no `isStreaming`, so a liveness rule
 * keyed on it being `true` would never refresh the heartbeat — the sweep would keep killing
 * healthy streams by age, exactly the bug `lastActivityAt` exists to fix.
 */
describe('livenessFor', () => {
  it('refreshes on a save that does not mention isStreaming', () => {
    expect(livenessFor(undefined, 1234)).toBe(1234)
  })

  it('refreshes on an explicitly streaming save', () => {
    expect(livenessFor(true, 1234)).toBe(1234)
  })

  it('clears once the stream has ended', () => {
    expect(livenessFor(false, 1234)).toBeUndefined()
  })
})
