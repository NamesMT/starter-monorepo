import { generateText } from 'ai'
import { describe, expect, it } from 'vitest'
import { getHostedModel } from './agent'

/**
 * Live check against the real hosted chain. Skipped unless RUN_LIVE_CHAIN=1, because it hits
 * third-party endpoints over the network.
 */
const live = process.env.RUN_LIVE_CHAIN === '1' ? describe : describe.skip

live('hosted free chain', () => {
  it('answers through auto/free even when the metered member is exhausted', async () => {
    const model = getHostedModel('auto/free')
    const { text } = await generateText({
      model,
      prompt: 'Reply with the single word OK',
      maxRetries: 0,
    })

    expect(text.trim().length).toBeGreaterThan(0)
  }, 120000)

  it('resolves a single keyless member directly', async () => {
    const model = getHostedModel('pollinations/openai')
    const { text } = await generateText({
      model,
      prompt: 'Reply with the single word OK',
      maxRetries: 0,
    })

    expect(text.trim().length).toBeGreaterThan(0)
  }, 120000)
})
