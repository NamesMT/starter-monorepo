import { describe, expect, it } from 'vitest'
import { getAgentModel } from './agent'

describe('getAgentModel BYOK key requirement', () => {
  it('refuses a BYOK provider with no apiKey instead of falling back to the env key', () => {
    // Guard against the deployment's own OPENAI_API_KEY being reachable anonymously.
    process.env.OPENAI_API_KEY = 'sk-operator-key'
    expect(() => getAgentModel({ provider: 'openai', model: 'gpt-4o' } as any)).toThrow(/requires an apiKey/)
    expect(() => getAgentModel({ provider: 'openai', model: 'gpt-4o', apiKey: '   ' } as any)).toThrow(/requires an apiKey/)
  })

  it('accepts a BYOK provider that supplies a key', () => {
    expect(getAgentModel({ provider: 'openai', model: 'gpt-4o', apiKey: 'sk-user' } as any)).toBeTruthy()
  })

  it('still resolves hosted models without a key', () => {
    expect(getAgentModel({ provider: 'hosted', model: 'auto/free' } as any)).toBeTruthy()
  })
})
