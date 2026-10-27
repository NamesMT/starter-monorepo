import { throttle } from 'kontroll'
import { describe, expect, it } from 'vitest'

/**
 * Pins the contract `respondWithAiStream`'s save throttle depends on.
 *
 * Kontroll defaults its key to `fn.toString()`. Two concurrent chat streams in one isolate
 * build textually identical save closures, so without an explicit key they share a slot: the
 * second callback is dropped, its text is never persisted, and its `pendingSave` flag stays
 * set — which made `waitForSave` log "Save was stuck" and lose the reply's tail.
 *
 * The action itself needs a deployment, so the collision is asserted here against the real
 * library, with the same call shape the action uses.
 */
describe('save throttle keying', () => {
  function makeStream(key?: string) {
    const saved: string[] = []
    let pending = false
    return {
      saved,
      get pending() {
        return pending
      },
      save(label: string) {
        pending = true
        throttle(
          50,
          async () => {
            await new Promise(resolve => setTimeout(resolve, 5))
            saved.push(label)
            pending = false
          },
          key === undefined ? { trailing: true } : { trailing: true, key },
        )
      },
    }
  }

  it('drops one stream\'s save when both share the default key', () => {
    const a = makeStream()
    const b = makeStream()

    a.save('a')
    b.save('b')

    // Synchronous scheduling: the second registration replaces the first.
    expect(a.pending && b.pending).toBe(true)
  })

  it('keeps both streams saving when keyed per message', async () => {
    const a = makeStream('message_a')
    const b = makeStream('message_b')

    a.save('a1')
    b.save('b1')
    a.save('a2')
    b.save('b2')

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(a.saved.at(-1)).toBe('a2')
    expect(b.saved.at(-1)).toBe('b2')
    // The dropped-callback bug also leaves this stuck, which is what stalled `waitForSave`.
    expect(a.pending).toBe(false)
    expect(b.pending).toBe(false)
  })
})
