/**
 * Tailwind 3 parity guard: Tailwind 4 ships its palette in oklch, which
 * renders slightly differently from the v3 sRGB values. app.css pins every
 * palette color the client uses to its v3 hex in @theme. A color class used
 * in a source file without a matching `--color-<name>-<shade>` entry would
 * silently render in the v4 shade.
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
const appCss = fs.readFileSync(path.join(srcDir, 'app.css'), 'utf8')

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.htm', '.html']
const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
// Any <utility>-<palette>-<shade> (bg-, border-t-, ring-offset-, ...). The
// lookbehind skips `--color-<name>-<shade>` definitions; black/white have no shade.
const COLOR_CLASS = new RegExp(
  `(?<![\\w-])[a-z]+(?:-[a-z]+)*?-((?:${PALETTE})-(?:50|[1-9]00|950))(?![\\w-])`,
  'g'
)
const THEME_COLOR =
  /--color-([a-z]+-(?:50|[1-9]00|950))\s*:\s*#[0-9a-f]{6}\s*;/g

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

function usedColors(text) {
  return new Set([...text.matchAll(COLOR_CLASS)].map((match) => match[1]))
}

describe('CSS palette parity guard', () => {
  const pinned = new Set([...appCss.matchAll(THEME_COLOR)].map((m) => m[1]))

  it('pins palette colors to v3 hex values in app.css', () => {
    assert.match(appCss, /@theme\s*{/)
    assert.ok(pinned.size > 0, 'no --color-<name>-<shade>: #hex entries')
  })

  it('pins every palette color used in client sources', () => {
    const missing = new Set()
    for (const file of sourceFiles(srcDir)) {
      for (const color of usedColors(fs.readFileSync(file, 'utf8'))) {
        if (!pinned.has(color)) {
          missing.add(color)
        }
      }
    }
    assert.deepStrictEqual([...missing].sort(), [])
  })

  it('detects color classes', () => {
    const found = usedColors(
      'hover:bg-blue-600 text-slate-900/50 ring-cyan-950 text-sm bg-black ' +
        'border-t-red-500 ring-offset-neutral-800 --color-zinc-100: #fff'
    )
    assert.deepStrictEqual([...found].sort(), [
      'blue-600',
      'cyan-950',
      'neutral-800',
      'red-500',
      'slate-900'
    ])
  })
})
