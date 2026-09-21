import { describe, expect, it } from 'vitest'
import { getHelloMessage } from '#src/api/dummy/hello.helper.js'
import { translate } from '#src/helpers/i18n.js'

describe('translate', () => {
  it('interpolates params into the translation', () => {
    expect(translate('hello-from-{x}', { x: 'the tests' })).toBe('Hello from the tests')
  })

  it('honours an explicit locale', () => {
    expect(translate('hello', {}, { locale: 'vi' })).toBe('Xin chào')
  })

  it('falls back to the key when the translation is missing', () => {
    expect(translate('missing.translation.key')).toBe('missing.translation.key')
  })
})

describe('getHelloMessage', () => {
  it('appends a timestamp to the interpolated message', () => {
    expect(getHelloMessage('unit tests')).toMatch(/^Hello from unit tests! - \d+$/)
  })
})
