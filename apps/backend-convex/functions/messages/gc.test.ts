import { describe, expect, it } from 'vitest'
import { ORPHAN_MIN_AGE_MS, selectOrphans } from './gc'

const HOUR = 60 * 60 * 1000
const NOW = 1_800_000_000_000

/** A stored file as the `_storage` system table reports it. */
function file(id: string, ageMs: number) {
  return { _id: id, _creationTime: NOW - ageMs }
}

describe('selectOrphans', () => {
  it('selects a file no message references', () => {
    const orphans = selectOrphans([file('a', 2 * HOUR)], new Set(), NOW)

    expect(orphans).toEqual(['a'])
  })

  it('keeps a file that a message still references', () => {
    const orphans = selectOrphans([file('a', 2 * HOUR)], new Set(['a']), NOW)

    expect(orphans).toEqual([])
  })

  it('separates referenced from unreferenced files in one pass', () => {
    const stored = [file('kept', 2 * HOUR), file('dropped', 2 * HOUR), file('alsoKept', 3 * HOUR)]

    expect(selectOrphans(stored, new Set(['kept', 'alsoKept']), NOW)).toEqual(['dropped'])
  })

  it('never reclaims a file younger than the grace period', () => {
    // An upload whose `storageId` has not been attached to a message yet looks exactly like
    // an orphan, so deleting it early would destroy a file that was about to be referenced.
    const orphans = selectOrphans([file('fresh', 5 * 1000)], new Set(), NOW)

    expect(orphans).toEqual([])
  })

  it('reclaims a file exactly at the age boundary', () => {
    expect(selectOrphans([file('edge', ORPHAN_MIN_AGE_MS)], new Set(), NOW)).toEqual(['edge'])
    expect(selectOrphans([file('justUnder', ORPHAN_MIN_AGE_MS - 1)], new Set(), NOW)).toEqual([])
  })

  it('is empty when nothing is stored', () => {
    expect(selectOrphans([], new Set(), NOW)).toEqual([])
  })

  it('reclaims everything unreferenced when the age is not constrained', () => {
    const stored = [file('a', 0), file('b', 0)]

    expect(selectOrphans(stored, new Set(), NOW, 0)).toEqual(['a', 'b'])
  })
})
