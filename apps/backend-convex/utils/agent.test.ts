import { streamText } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { withProviderErrorAsText } from './agent'

/**
 * Regression guard for the empty-message bug.
 *
 * AI SDK v7 rejects its internal result promises with `NoOutputGeneratedError` when a
 * model stream produces no output (e.g. a provider error). In Convex that rejection is
 * fatal and used to tear down the HTTP action right after the `start` chunk, leaving the
 * assistant message empty. The wrapper must convert the failure into normal output so the
 * stream finishes and the error text is delivered.
 */
describe('withProviderErrorAsText', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('converts a provider failure into assistant text instead of an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const model = new MockLanguageModelV4({
      doStream: async () => { throw new Error('User not found.') },
    })

    const result = streamText({
      model: withProviderErrorAsText(model),
      prompt: 'hi',
    })

    const text = await result.text
    expect(text).toContain('Error encountered, stream stopped')
    expect(text).toContain('User not found.')
    await expect(result.finishReason).resolves.toBe('error')
  })

  it('passes through a successful stream untouched', async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings: [] })
            controller.enqueue({ type: 'text-start', id: '1' })
            controller.enqueue({ type: 'text-delta', id: '1', delta: 'Hello' })
            controller.enqueue({ type: 'text-delta', id: '1', delta: ' world' })
            controller.enqueue({ type: 'text-end', id: '1' })
            controller.enqueue({
              type: 'finish',
              finishReason: { unified: 'stop', raw: 'stop' },
              usage: {
                inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 2, text: 2, reasoning: 0 },
              },
            })
            controller.close()
          },
        }),
      }),
    })

    const result = streamText({
      model: withProviderErrorAsText(model),
      prompt: 'hi',
    })

    await expect(result.text).resolves.toBe('Hello world')
  })
})
