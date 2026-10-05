import type { ModelMessage } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText } from 'ai'
import { describe, expect, it } from 'vitest'
import { cachingCallProviderOptions, cachingStrategyFor, withAnthropicCacheBreakpoints } from './caching'

/**
 * These run the real `streamText` path against a mocked `fetch` and assert the request that
 * would reach the provider.
 *
 * The pure placement tests in `caching.test.ts` cannot catch the failure mode this guards
 * against: cache wiring is silently inert when wrong. A marker on the wrong message, in the
 * wrong `providerOptions` namespace, or on a provider that ignores it produces a perfectly
 * successful request that simply never caches anything — and Anthropic never errors for a
 * marker it discards.
 *
 * No network and no API keys: the fetch is captured and answered with an error, because the
 * request body is the artifact under test, not the response.
 */

function conversation(): ModelMessage[] {
  return [
    { role: 'user', content: 'first question' },
    { role: 'assistant', content: 'first answer' },
    { role: 'user', content: 'second question' },
  ]
}

/** Captures the request body a provider would send, answering with an expected error. */
function capturingFetch(): { fetch: any, body: () => Record<string, any> | undefined } {
  let captured: Record<string, any> | undefined

  const fetch = (async (_url: string, init: { body: string }) => {
    captured = JSON.parse(init.body)
    return new Response(JSON.stringify({ error: { message: 'captured' } }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }) as any

  return { fetch, body: () => captured }
}

/** Runs one turn through the real `streamText` path with this module's caching applied. */
async function sendTurn({ provider, model, instructions = 'SYSTEM PROMPT' }: {
  provider: string
  model: any
  instructions?: string
}) {
  const strategy = cachingStrategyFor(provider)
  const prompt = { instructions, messages: conversation() }
  const cacheable = strategy === 'anthropic-explicit' ? withAnthropicCacheBreakpoints(prompt) : prompt
  const providerOptions = cachingCallProviderOptions(strategy, 'thread-abc')

  const result = streamText({
    model,
    instructions: cacheable.instructions,
    messages: cacheable.messages,
    ...(providerOptions ? { providerOptions } : {}),
  })

  // The mocked fetch always errors, which is expected and irrelevant here; draining the
  // stream is what triggers the request.
  try {
    for await (const _ of result.textStream) { /* not reached */ }
  }
  catch { /* expected */ }
}

describe('cache markers on the wire', () => {
  it('marks the Anthropic system message and the last message, and nothing else', async () => {
    const { fetch, body } = capturingFetch()
    await sendTurn({
      provider: 'anthropic',
      model: createAnthropic({ apiKey: 'test', fetch })('claude-sonnet-4'),
    })

    expect(body()!.system).toEqual([
      { type: 'text', text: 'SYSTEM PROMPT', cache_control: { type: 'ephemeral' } },
    ])

    const messages = body()!.messages as any[]
    expect(messages.at(-1).content.at(-1).cache_control).toEqual({ type: 'ephemeral' })
    // Nothing on the earlier messages: the breakpoint marks a prefix, not every turn.
    expect(messages[0].content[0].cache_control).toBeUndefined()
    expect((JSON.stringify(body()).match(/cache_control/g) ?? []).length).toBe(2)
  })

  it('does not emit a top-level cache_control, which is a different Anthropic mechanism', async () => {
    // A call-level `anthropic.cacheControl` becomes Anthropic's automatic-caching mode rather
    // than the explicit per-message breakpoints this module places.
    const { fetch, body } = capturingFetch()
    await sendTurn({
      provider: 'anthropic',
      model: createAnthropic({ apiKey: 'test', fetch })('claude-sonnet-4'),
    })

    expect(body()!.cache_control).toBeUndefined()
  })

  it('keeps a keyless OpenAI-compatible member byte-clean', async () => {
    // The hosted chain's keyless members have no caching surface, and an unknown
    // providerOptions namespace is dropped rather than forwarded, so marking them would be
    // inert at best. Assert no cache field reaches them at all.
    const { fetch, body } = capturingFetch()
    await sendTurn({
      provider: 'hosted',
      model: createOpenAICompatible({
        name: 'pollinations/openai',
        baseURL: 'https://example.test/v1',
        apiKey: 'test',
        fetch,
      })('openai'),
    })

    expect(Object.keys(body()!).sort()).toEqual(['messages', 'model', 'stream'])
    expect(JSON.stringify(body())).not.toMatch(/cache_control|prompt_cache/)
  })
})
