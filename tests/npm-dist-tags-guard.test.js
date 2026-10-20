/**
 * Guards against repo scripts that move npm dist-tags by hand (#155).
 *
 * fix-npm-tags.sh once pointed `latest` at 2.0.0. Releases set `latest`
 * through `npm publish` in CI, so no tracked file should run
 * `npm dist-tag add`.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'public',
  'coverage',
  'dist'
])
const SCAN_EXT = /\.(sh|bash|js|mjs|cjs|ts|json|ya?ml)$/
const DIST_TAG_ADD = /npm\s+dist-tag\s+add\b/
const thisFile = fileURLToPath(import.meta.url)

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name))
        collectFiles(path.join(dir, entry.name), out)
    } else if (SCAN_EXT.test(entry.name)) {
      out.push(path.join(dir, entry.name))
    }
  }
  return out
}

describe('npm dist-tag guard', () => {
  it('fix-npm-tags.sh is removed', () => {
    assert.strictEqual(
      fs.existsSync(path.join(repoRoot, 'fix-npm-tags.sh')),
      false
    )
  })

  it('no script, workflow or package script runs npm dist-tag add', () => {
    const offenders = collectFiles(repoRoot)
      .filter((file) => file !== thisFile)
      .filter((file) => DIST_TAG_ADD.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(repoRoot, file))
    assert.deepStrictEqual(offenders, [])
  })
})
