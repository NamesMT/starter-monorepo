#!/usr/bin/env node
/**
 * Resolves the workspace package a release was dispatched for, and checks the requested version
 * against the one on disk.
 *
 * Human-readable messages go to stderr and `key=value` output goes to stdout, so a workflow can
 * append this straight to $GITHUB_OUTPUT while the log stays readable.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const pkgName = (process.argv[2] ?? '').trim()
const requested = (process.argv[3] ?? '').trim().replace(/^v/, '')

if (pkgName.length === 0) {
  console.error('usage: release-target.mjs <package> [version]')
  process.exit(1)
}

/** Which of two versions is higher: -1, 0 or 1. */
function compare(left, right) {
  const a = left.split('-')[0].split('.').map(Number)
  const b = right.split('-')[0].split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0))
      return (a[index] ?? 0) > (b[index] ?? 0) ? 1 : -1
  }
  return left === right ? 0 : left.includes('-') ? -1 : 1
}

const packages = JSON.parse(
  execFileSync('pnpm', ['-r', 'list', '--depth', '-1', '--json'], { cwd: root, encoding: 'utf8' }),
)
const target = packages.find(entry => entry.name === pkgName)

if (!target) {
  console.error(`[release] no workspace package named "${pkgName}" — available:`)
  for (const entry of packages)
    console.error(`  - ${entry.name}`)
  process.exit(1)
}

const current = target.version ?? '0.0.0'

if (requested.length > 0) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Z.-]+)?$/i.test(requested)) {
    console.error(`[release] "${requested}" is not a version — expected 1.2.3 or 1.2.3-rc.1`)
    process.exit(1)
  }
  if (compare(requested, current) <= 0) {
    console.error(`[release] "${requested}" is not greater than ${pkgName}'s current ${current}`)
    process.exit(1)
  }
}

console.error(`[release] ${pkgName}: ${current} -> ${requested || '(bumped from the commits)'}`)

// npm refuses to publish a package whose package.json sets `"private": true`, so a private package
// still gets the changelog, tag and GitHub release, but no publish.
const isPrivate = target.private === true
if (isPrivate)
  console.error(`[release] ${pkgName} is "private" — publish will be skipped`)

console.log(`path=${path.relative(root, target.path)}`)
console.log(`publish=${isPrivate ? 'false' : 'true'}`)
