/**
 * Tailwind 3 parity guard for @tailwindcss/forms focus borders.
 *
 * In Tailwind 3 the forms plugin's focus rules (`textarea:focus`, specificity
 * 0,1,1) beat plain border-color utilities such as `border-red-500` (0,1,0),
 * so a focused invalid private-key field turned blue. Tailwind 4 moves those
 * rules into the base layer, where every utility wins. app.css restores the
 * border color inside `@layer utilities` at the v3 specificity: above
 * `border-*`, below `focus:border-*` (0,2,0).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appCss = fs
  .readFileSync(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../client/src/app.css'
    ),
    'utf8'
  )
  .replace(/\/\*[\s\S]*?\*\//g, '')

// Returns the body of each top-level `@layer utilities { ... }` block.
function utilityLayers(css) {
  const blocks = []
  let from = 0
  for (;;) {
    const start = css.indexOf('@layer utilities', from)
    if (start === -1) return blocks
    const open = css.indexOf('{', start)
    let depth = 0
    let i = open
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++
      if (css[i] === '}' && --depth === 0) break
    }
    blocks.push(css.slice(open + 1, i))
    from = i
  }
}

// Specificity [ids, classes/attributes/pseudo-classes, types] of a simple
// compound selector; :where(...) contributes nothing.
function specificity(selector) {
  const s = selector.replace(/:where\((?:[^()]|\([^()]*\))*\)/g, '')
  const ids = (s.match(/#[\w-]+/g) || []).length
  const classes = (s.match(/\.(?:\\.|[\w-])+|\[[^\]]*\]|:(?!:)[\w-]+/g) || [])
    .length
  const types = (s.match(/(?:^|[\s>+~])[a-z][\w-]*/gi) || []).length
  return [ids, classes, types]
}

// Splits a selector list on commas that are not inside parentheses.
function splitTopLevel(list) {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of list) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  return [...parts, current]
}

const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

function focusBorderRule() {
  for (const block of utilityLayers(appCss)) {
    const match = block.match(/([^{}]+)\{([^{}]*)\}/)
    if (match && /textarea:focus/.test(match[1])) {
      return {
        selectors: splitTopLevel(match[1]).map((s) =>
          s.replace(/\s+/g, ' ').trim()
        ),
        body: match[2]
      }
    }
  }
  return null
}

describe('forms focus border parity', () => {
  const rule = focusBorderRule()

  it('restores the focus border color in the utilities layer', () => {
    assert.ok(rule, 'no `textarea:focus` rule inside @layer utilities')
    assert.match(rule.body, /border-color:\s*var\(--color-blue-600\)/)
    assert.match(appCss, /--color-blue-600:\s*#2563eb;/)
  })

  it('covers the text inputs, select and textarea', () => {
    const all = rule.selectors.join(' ')
    for (const part of [
      "[type='text']",
      "[type='password']",
      "[type='number']",
      ':not([type])',
      'select:focus',
      'textarea:focus'
    ]) {
      assert.ok(all.includes(part), `missing ${part}`)
    }
  })

  it('beats border-* and loses to focus:border-*', () => {
    const plain = specificity('.border-red-500')
    const focused = specificity('.focus\\:border-blue-500:focus')
    for (const selector of rule.selectors) {
      const spec = specificity(selector)
      assert.ok(compare(spec, plain) > 0, `${selector} must beat border-*`)
      assert.ok(
        compare(spec, focused) < 0,
        `${selector} must lose to focus:border-*`
      )
    }
  })

  it('computes specificity as expected', () => {
    assert.deepStrictEqual(specificity('textarea:focus'), [0, 1, 1])
    assert.deepStrictEqual(
      specificity("input:where([type='text'], :not([type])):focus"),
      [0, 1, 1]
    )
    assert.deepStrictEqual(specificity("[type='text']:focus"), [0, 2, 0])
    assert.deepStrictEqual(specificity('.border-red-500'), [0, 1, 0])
    assert.deepStrictEqual(
      specificity('.focus\\:border-blue-500:focus'),
      [0, 2, 0]
    )
  })
})
