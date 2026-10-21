/**
 * The HTML templates must not contain executable inline scripts, so a
 * strict `script-src 'self'` policy produces no CSP report on page load.
 * Runtime config comes only from the inert JSON data block that the
 * gateway (webssh2 server >= 5.1.0) fills in. When a production build is
 * present, the emitted client.htm is checked too.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const builtClient = path.join(root, 'client/public/client.htm')

const templates = ['client/src/client.htm', 'client/src/index.html']
if (fs.existsSync(builtClient)) {
  templates.push('client/public/client.htm')
}

// Script types the browser never executes, so CSP does not apply to them
const INERT_TYPES = new Set(['application/json'])

for (const template of templates) {
  describe(template, () => {
    const html = fs.readFileSync(path.join(root, template), 'utf8')
    const { document } = new JSDOM(html).window
    const scripts = [...document.querySelectorAll('script')]

    it('has no executable inline script', () => {
      const inline = scripts.filter(
        (s) =>
          !s.hasAttribute('src') &&
          !INERT_TYPES.has((s.getAttribute('type') ?? '').toLowerCase())
      )
      assert.deepStrictEqual(
        inline.map((s) => s.textContent.trim()),
        []
      )
    })

    it('does not reference the legacy window.webssh2Config global', () => {
      assert.ok(!html.includes('webssh2Config'))
    })

    it('has exactly one JSON config block', () => {
      const blocks = scripts.filter((s) => s.id === 'webssh2-config')
      assert.strictEqual(blocks.length, 1)
      assert.strictEqual(blocks[0].getAttribute('type'), 'application/json')
    })
  })
}
