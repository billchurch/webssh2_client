import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { resolveHeaderFromConfig, validateHeaderBackground } =
  await import('../client/src/utils/header.ts')

const { dispatchHeaderUpdate } =
  await import('../client/src/utils/header-dispatch.ts')

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
    assert.strictEqual(validateHeaderBackground('rgb(0, 0, 0)'), 'rgb(0, 0, 0)')
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
    assert.strictEqual(validateHeaderBackground('javascript:alert(1)'), null)
  })
})

describe('dispatchHeaderUpdate — headerBackground element', () => {
  it('returns update with valid hex color', () => {
    const result = dispatchHeaderUpdate('headerBackground', '#ff00aa', null)
    assert.deepStrictEqual(result, {
      kind: 'update',
      next: { text: '', background: '#ff00aa' }
    })
  })

  it('returns update with named color, preserves existing text', () => {
    const result = dispatchHeaderUpdate('headerBackground', 'red', {
      text: 'keep'
    })
    assert.deepStrictEqual(result, {
      kind: 'update',
      next: { text: 'keep', background: 'red' }
    })
  })

  it('returns noop for Tailwind clickjacking payload', () => {
    const result = dispatchHeaderUpdate(
      'headerBackground',
      'fixed inset-0 z-50 bg-black',
      { text: 'keep' }
    )
    assert.deepStrictEqual(result, { kind: 'noop' })
  })

  it('returns noop for CSS injection payload', () => {
    const result = dispatchHeaderUpdate(
      'headerBackground',
      "background: red url('//evil/x')",
      null
    )
    assert.deepStrictEqual(result, { kind: 'noop' })
  })

  it('returns noop for non-string value', () => {
    assert.deepStrictEqual(dispatchHeaderUpdate('headerBackground', 42, null), {
      kind: 'noop'
    })
    assert.deepStrictEqual(
      dispatchHeaderUpdate('headerBackground', undefined, null),
      { kind: 'noop' }
    )
  })
})

describe('dispatchHeaderUpdate — header element', () => {
  it('returns update with valid object payload', () => {
    const result = dispatchHeaderUpdate(
      'header',
      { text: 'P', background: '#ff00aa' },
      null
    )
    assert.deepStrictEqual(result, {
      kind: 'update',
      next: { text: 'P', background: '#ff00aa' }
    })
  })

  it('omits background when payload background is Tailwind', () => {
    const result = dispatchHeaderUpdate(
      'header',
      { text: 'P', background: 'fixed inset-0 z-50 bg-black' },
      null
    )
    assert.deepStrictEqual(result, {
      kind: 'update',
      next: { text: 'P' }
    })
  })

  it('omits background when payload background is CSS injection', () => {
    const result = dispatchHeaderUpdate(
      'header',
      { text: 'P', background: "background: red url('//evil/x')" },
      null
    )
    assert.deepStrictEqual(result, {
      kind: 'update',
      next: { text: 'P' }
    })
  })

  it('accepts string payload (text-only)', () => {
    const result = dispatchHeaderUpdate('header', 'just text', null)
    assert.deepStrictEqual(result, {
      kind: 'update',
      next: { text: 'just text' }
    })
  })

  it('coerces non-string text in object payload to empty string', () => {
    const result = dispatchHeaderUpdate(
      'header',
      { text: 42, background: 'red' },
      null
    )
    assert.deepStrictEqual(result, {
      kind: 'update',
      next: { text: '', background: 'red' }
    })
  })
})

describe('dispatchHeaderUpdate — headerStyle and unknown elements', () => {
  it('returns noop for headerStyle element (any payload)', () => {
    assert.deepStrictEqual(
      dispatchHeaderUpdate('headerStyle', 'fixed inset-0 z-50 bg-black', null),
      { kind: 'noop' }
    )
    assert.deepStrictEqual(
      dispatchHeaderUpdate('headerStyle', { fullStyle: 'x' }, null),
      { kind: 'noop' }
    )
  })

  it('returns noop for unknown elements', () => {
    assert.deepStrictEqual(dispatchHeaderUpdate('whatever', 'x', null), {
      kind: 'noop'
    })
  })
})
