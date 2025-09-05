/**
 * Accessibility smoke tests for the terminal UI
 * - Loads client/src/index.html with JSDOM
 * - Runs axe-core to ensure no critical violations
 *
 * Run: node --test tests/a11y-terminal.test.js
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import * as jestAxe from 'jest-axe'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

describe('Accessibility - Terminal UI', () => {
  /** @type {import('jsdom').JSDOM} */
  let dom
  /** @type {Document} */
  let document

  before(async () => {
    const htmlPath = path.join('client', 'src', 'index.html')
    const html = await readFile(htmlPath, 'utf8')

    dom = new JSDOM(html, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      // We do not execute scripts for this static analysis
      runScripts: 'outside-only',
      resources: 'usable'
    })
    document = dom.window.document
    // Expose JSDOM globals for libraries expecting global document/window
    global.window = dom.window
    global.document = document
    global.HTMLElement = dom.window.HTMLElement
    global.Node = dom.window.Node
  })

  after(() => {
    dom?.window.close()
    // Best-effort cleanup of globals
    // eslint-disable-next-line no-undef
    delete global.window
    // eslint-disable-next-line no-undef
    delete global.document
    // eslint-disable-next-line no-undef
    delete global.HTMLElement
    // eslint-disable-next-line no-undef
    delete global.Node
  })

  it('loads base structure and status region exists', () => {
    assert.ok(document)
    assert.equal(document.title.trim().length > 0, true, 'document has a title')
    const status = document.getElementById('status')
    assert.ok(status, 'status region exists')
  })

  it('has no critical axe violations', async () => {
    const { axe } = jestAxe
    const results = await axe(document.body)
    const critical = results.violations.filter((v) => v.impact === 'critical')
    assert.equal(
      critical.length,
      0,
      `Critical a11y issues: ${critical.map((v) => v.id).join(', ')}`
    )
  })
})
