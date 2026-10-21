/**
 * Tailwind 4 class-name guard: the v3 → v4 codemod renamed these utilities
 * (or v4 changed what they mean). Code written against Tailwind 3 and merged
 * later must be migrated the same way, or it renders differently:
 *
 *   outline-none → outline-hidden   (v4 outline-none drops the forced-colors outline)
 *   rounded      → rounded-sm       shadow → shadow-sm      ring → ring-3
 *   blur         → blur-sm          drop-shadow → drop-shadow-sm
 *   flex-shrink-* → shrink-*        flex-grow-* → grow-*
 *   *-opacity-*  → color/<alpha>    overflow-ellipsis → text-ellipsis
 *
 * See https://tailwindcss.com/docs/upgrade-guide#renamed-utilities
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../client/src'
)

const SOURCE_EXTENSIONS = ['.tsx', '.html']

// A v3-only utility, with any variant prefixes (hover:, sm:, focus-visible:).
const V3_CLASS =
  /^(?:[\w-]+:)*!?(?:outline-none|rounded|shadow|ring|blur|drop-shadow|backdrop-blur|flex-shrink(?:-\d+)?|flex-grow(?:-\d+)?|(?:bg|text|border|divide|ring|placeholder)-opacity-\d+|overflow-ellipsis|decoration-(?:slice|clone))$/

// String literals: "...", '...' and `...` (template text only).
const STRING = /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : sourceFiles(full)
    }
    return SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))
      ? [full]
      : []
  })
}

function v3Classes(source) {
  const found = []
  for (const match of source.matchAll(STRING)) {
    const text = (match[1] ?? match[2] ?? match[3]).replace(/\$\{[^}]*\}/g, ' ')
    for (const token of text.split(/\s+/)) {
      if (V3_CLASS.test(token)) found.push(token)
    }
  }
  return found
}

describe('Tailwind 4 class names', () => {
  const files = sourceFiles(srcDir)

  it('finds sources to check', () => {
    assert.ok(files.length > 0, `no sources under ${srcDir}`)
  })

  it('uses no Tailwind 3 class names', () => {
    const offenders = files.flatMap((file) =>
      v3Classes(fs.readFileSync(file, 'utf8')).map(
        (token) => `${path.relative(srcDir, file)}: ${token}`
      )
    )
    assert.deepStrictEqual(offenders, [])
  })

  it('detects v3 class names', () => {
    assert.deepStrictEqual(
      v3Classes(
        'class="rounded bg-white focus:outline-none" x={`shadow ${a} hover:flex-shrink-0`} y=\'bg-opacity-50\''
      ),
      [
        'rounded',
        'focus:outline-none',
        'shadow',
        'hover:flex-shrink-0',
        'bg-opacity-50'
      ]
    )
    assert.deepStrictEqual(
      v3Classes(
        'class="rounded-sm shadow-xs ring-3 outline-hidden shrink-0 rounded-md"'
      ),
      []
    )
  })
})
