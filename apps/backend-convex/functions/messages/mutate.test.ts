import { describe, expect, it } from 'vitest'
import { stopPatch } from './mutate'

/**
 * `requestStop` is a Convex mutation and needs a deployment, so its decision is extracted
 * into `stopPatch` and tested here. That decision is where the bug was: finalizing only in
 * the generating action left `isStreaming` set when the abort tore the action down, and the
 * client then polled a reply that never ended.
 */
describe('stopPatch', () => {
  it('finalizes a streaming reply so the client stops polling it', () => {
    expect(stopPatch({ isStreaming: true })).toEqual({
      cancelRequested: true,
      isStreaming: false,
      streamId: undefined,
    })
  })

  it('returns nothing for a reply that already finished', () => {
    expect(stopPatch({ isStreaming: false })).toBeNull()
    expect(stopPatch({})).toBeNull()
  })

  it('applies the same result twice, so a double click cannot corrupt state', () => {
    const first = stopPatch({ isStreaming: true })

    expect(stopPatch(first ?? {})).toBeNull()
  })
})
