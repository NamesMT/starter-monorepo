import { describe, expect, it } from 'vitest'
import { matchesAttachmentAccept } from './chat'

describe('matchesAttachmentAccept', () => {
  it('accepts everything when the list is empty', () => {
    expect(matchesAttachmentAccept('application/zip', 'a.zip', [])).toBe(true)
  })

  it('matches an exact MIME type', () => {
    expect(matchesAttachmentAccept('application/pdf', 'a.pdf', ['application/pdf'])).toBe(true)
    expect(matchesAttachmentAccept('image/png', 'a.png', ['application/pdf'])).toBe(false)
  })

  it('matches a MIME wildcard', () => {
    expect(matchesAttachmentAccept('image/png', 'a.png', ['image/*'])).toBe(true)
    expect(matchesAttachmentAccept('application/pdf', 'a.pdf', ['image/*'])).toBe(false)
  })

  it('matches the catch-all wildcards', () => {
    expect(matchesAttachmentAccept('image/png', 'a.png', ['*/*'])).toBe(true)
    expect(matchesAttachmentAccept('application/zip', 'a.zip', ['*'])).toBe(true)
  })

  it('matches an extension regardless of case', () => {
    expect(matchesAttachmentAccept('application/octet-stream', 'a.PDF', ['.pdf'])).toBe(true)
    expect(matchesAttachmentAccept('application/octet-stream', 'a.txt', ['.pdf'])).toBe(false)
  })

  it('ignores blank entries and surrounding whitespace', () => {
    expect(matchesAttachmentAccept('image/png', 'a.png', ['', '  ', ' image/* '])).toBe(true)
    expect(matchesAttachmentAccept('image/png', 'a.png', ['', '  '])).toBe(false)
  })
})
