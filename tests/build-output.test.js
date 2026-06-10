/**
 * Verifies the production build emits content-hashed filenames compatible
 * with the webssh2 gateway's immutable-cache pattern (-\w{8,}\.(js|css)),
 * and that client.htm references the emitted names exactly.
 *
 * Skips when no build output is present (run `npm run build` first).
 * CI builds before testing, so these assertions always run there.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../client/public'
)
const hasBuild = fs.existsSync(path.join(publicDir, 'client.htm'))

// Matches the webssh2 gateway's immutable-cache filename pattern.
// hashCharacters: 'hex' guarantees [0-9a-f]; \w{8,} is the server contract.
const HASHED_PATTERN = /^[A-Za-z0-9_.]+-[0-9a-f]{8,}\.(js|css)$/

describe('production build output', { skip: !hasBuild && 'no build output' }, () => {
  const files = hasBuild ? fs.readdirSync(publicDir) : []
  const jsFiles = files.filter((f) => f.endsWith('.js'))
  const cssFiles = files.filter((f) => f.endsWith('.css'))

  it('keeps stable names for client.htm and favicon.ico', () => {
    assert.ok(files.includes('client.htm'))
    assert.ok(files.includes('favicon.ico'))
  })

  it('emits no legacy stable-named bundles', () => {
    assert.ok(!files.includes('webssh2.bundle.js'))
    assert.ok(!files.includes('webssh2.css'))
    assert.ok(!files.includes('xterm.css'))
  })

  it('emits only gateway-immutable-compatible hashed js/css names', () => {
    for (const f of [...jsFiles, ...cssFiles]) {
      assert.match(f, HASHED_PATTERN, `${f} would miss immutable caching`)
    }
  })

  it('emits one hashed entry bundle and two distinct hashed stylesheets', () => {
    assert.strictEqual(
      jsFiles.filter((f) => f.startsWith('webssh2-')).length,
      1
    )
    assert.strictEqual(
      cssFiles.filter((f) => f.startsWith('webssh2-')).length,
      1
    )
    assert.strictEqual(
      cssFiles.filter((f) => f.startsWith('xterm-')).length,
      1
    )
  })

  it('client.htm references the emitted hashed entry and stylesheet', () => {
    const html = fs.readFileSync(path.join(publicDir, 'client.htm'), 'utf-8')
    const entry = jsFiles.find((f) => f.startsWith('webssh2-'))
    const css = cssFiles.find((f) => f.startsWith('webssh2-'))
    assert.ok(html.includes(`./${entry}`), `client.htm missing ${entry}`)
    assert.ok(html.includes(`./${css}`), `client.htm missing ${css}`)
  })

  it('entry bundle references the hashed xterm stylesheet for dynamic import', () => {
    const entry = jsFiles.find((f) => f.startsWith('webssh2-'))
    const xtermCss = cssFiles.find((f) => f.startsWith('xterm-'))
    const code = fs.readFileSync(path.join(publicDir, entry), 'utf-8')
    assert.ok(code.includes(xtermCss), `bundle missing ref to ${xtermCss}`)
  })
})
