/**
 * Guards against debugging globals in the client (#165).
 *
 * The Socket.IO socket and the terminal manager used to be assigned to
 * `window.webssh2Socket` and `globalThis.terminalManager` for E2E tests.
 * They widen what a future XSS could reach, so the client must not expose
 * them. The source check always runs; the bundle check runs when build
 * output is present (run `npm run build` first).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'client/src')
const publicDir = path.join(root, 'client/public')

const FORBIDDEN = [
  /webssh2Socket/,
  /globalThis\s*(?:as[^)]*\))?\s*\.\s*terminalManager/
]

function listFiles(dir, exts) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(full, exts)
    return exts.some((ext) => entry.name.endsWith(ext)) ? [full] : []
  })
}

describe('no debugging globals', () => {
  it('client/src does not assign or declare the debug globals', () => {
    const files = listFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx'])
    assert.ok(files.length > 0)
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      for (const pattern of FORBIDDEN) {
        assert.doesNotMatch(
          source,
          pattern,
          `${path.relative(root, file)} matches ${pattern}`
        )
      }
    }
  })

  it('socket service and terminal do not write to window/globalThis', () => {
    for (const rel of [
      'client/src/services/socket.ts',
      'client/src/components/Terminal.tsx'
    ]) {
      const source = fs.readFileSync(path.join(root, rel), 'utf8')
      assert.doesNotMatch(source, /\bwindow\.\w+\s*=[^=]/, rel)
      assert.doesNotMatch(
        source,
        /\bglobalThis\b[^\n;]*\)\s*\.\s*\w+\s*=[^=]/,
        rel
      )
      assert.doesNotMatch(source, /declare global/, rel)
    }
  })

  const hasBuild = fs.existsSync(path.join(publicDir, 'client.htm'))
  it(
    'production bundle does not reference the debug globals',
    { skip: !hasBuild && 'no build output' },
    () => {
      const bundles = listFiles(publicDir, ['.js'])
      assert.ok(bundles.length > 0)
      for (const file of bundles) {
        const source = fs.readFileSync(file, 'utf8')
        assert.doesNotMatch(source, /webssh2Socket/, path.basename(file))
        assert.doesNotMatch(
          source,
          /\.terminalManager\s*=/,
          path.basename(file)
        )
      }
    }
  )
})
