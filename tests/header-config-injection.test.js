import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { resolveHeaderFromConfig, validateHeaderBackground } =
  await import('../client/src/utils/header.ts')

describe('resolveHeaderFromConfig', () => {
  it('returns null when config is undefined', () => {
    assert.strictEqual(resolveHeaderFromConfig(undefined), null)
  })

  it('returns null when config.header is missing', () => {
    assert.strictEqual(resolveHeaderFromConfig({}), null)
  })

  it('returns null when both text and background are null', () => {
    const result = resolveHeaderFromConfig({
      header: { text: null, background: null }
    })
    assert.strictEqual(result, null)
  })

  it('falls back to #000 background when only text is set', () => {
    const result = resolveHeaderFromConfig({
      header: { text: 'foo', background: null }
    })
    assert.deepStrictEqual(result, { text: 'foo', background: '#000' })
  })

  it('uses empty text when only background is set', () => {
    const result = resolveHeaderFromConfig({
      header: { text: null, background: 'green' }
    })
    assert.deepStrictEqual(result, { text: '', background: 'green' })
  })

  it('passes through valid text and background', () => {
    const result = resolveHeaderFromConfig({
      header: { text: 'foo', background: 'green' }
    })
    assert.deepStrictEqual(result, { text: 'foo', background: 'green' })
  })

  it('accepts hex color backgrounds', () => {
    const result = resolveHeaderFromConfig({
      header: { text: 'foo', background: '#ff00aa' }
    })
    assert.deepStrictEqual(result, { text: 'foo', background: '#ff00aa' })
  })

  it('accepts rgb function backgrounds', () => {
    const result = resolveHeaderFromConfig({
      header: { text: 'foo', background: 'rgb(0, 0, 0)' }
    })
    assert.deepStrictEqual(result, { text: 'foo', background: 'rgb(0, 0, 0)' })
  })

  it('rejects malformed background and falls back to #000', () => {
    const result = resolveHeaderFromConfig({
      header: {
        text: 'foo',
        background: 'red; } body{display:none} /*'
      }
    })
    assert.deepStrictEqual(result, { text: 'foo', background: '#000' })
  })

  it('rejects javascript: protocol in background', () => {
    const result = resolveHeaderFromConfig({
      header: { text: 'foo', background: 'javascript:alert(1)' }
    })
    assert.deepStrictEqual(result, { text: 'foo', background: '#000' })
  })
})

describe('validateHeaderBackground', () => {
  it('returns null for non-string input', () => {
    assert.strictEqual(validateHeaderBackground(undefined), null)
    assert.strictEqual(validateHeaderBackground(null), null)
    assert.strictEqual(validateHeaderBackground(42), null)
    assert.strictEqual(validateHeaderBackground({}), null)
  })

  it('accepts hex colors', () => {
    assert.strictEqual(validateHeaderBackground('#ff00aa'), '#ff00aa')
  })

  it('accepts named colors', () => {
    assert.strictEqual(validateHeaderBackground('red'), 'red')
  })

  it('accepts rgb function notation', () => {
    assert.strictEqual(
      validateHeaderBackground('rgb(0, 0, 0)'),
      'rgb(0, 0, 0)'
    )
  })

  it('rejects Tailwind class strings', () => {
    assert.strictEqual(
      validateHeaderBackground('fixed inset-0 z-50 bg-black'),
      null
    )
  })

  it('rejects CSS injection payloads with semicolons', () => {
    assert.strictEqual(
      validateHeaderBackground("background: red url('//evil/x')"),
      null
    )
  })

  it('rejects javascript: protocol', () => {
    assert.strictEqual(
      validateHeaderBackground('javascript:alert(1)'),
      null
    )
  })
})
