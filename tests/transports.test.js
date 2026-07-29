/**
 * Tests for the injected Socket.IO transport resolver (#131).
 *
 * The gateway may inject socket.transports into the runtime config. The
 * client whitelist-filters it (defense in depth: the target environment
 * is a meddling proxy) and falls back to the websocket-first default
 * whenever the injected value is absent, malformed, or empties out
 * after filtering.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { resolveTransports, DEFAULT_TRANSPORTS } =
  await import('../client/src/utils/transports.ts')

describe('resolveTransports', () => {
  it('returns the websocket-first default when nothing is injected', () => {
    assert.deepStrictEqual(resolveTransports(undefined), [
      'websocket',
      'polling'
    ])
    assert.deepStrictEqual(resolveTransports(null), ['websocket', 'polling'])
  })

  it('honors a valid injected list, preserving order', () => {
    assert.deepStrictEqual(resolveTransports(['polling']), ['polling'])
    assert.deepStrictEqual(resolveTransports(['polling', 'websocket']), [
      'polling',
      'websocket'
    ])
  })

  it('filters unknown transports, keeping valid ones in order', () => {
    assert.deepStrictEqual(
      resolveTransports(['carrier-pigeon', 'polling', 'webtransport']),
      ['polling']
    )
  })

  it('drops non-string entries', () => {
    assert.deepStrictEqual(resolveTransports([42, 'polling', {}]), ['polling'])
  })

  it('dedupes while preserving first occurrence order', () => {
    assert.deepStrictEqual(
      resolveTransports(['polling', 'polling', 'websocket']),
      ['polling', 'websocket']
    )
  })

  it('falls back to the default when the list empties after filtering', () => {
    assert.deepStrictEqual(resolveTransports([]), ['websocket', 'polling'])
    assert.deepStrictEqual(resolveTransports(['smoke-signal']), [
      'websocket',
      'polling'
    ])
  })

  it('falls back to the default for non-array input', () => {
    assert.deepStrictEqual(resolveTransports('polling'), [
      'websocket',
      'polling'
    ])
  })

  it('returns a fresh array, never the DEFAULT_TRANSPORTS reference', () => {
    const result = resolveTransports(undefined)
    assert.notStrictEqual(result, DEFAULT_TRANSPORTS)
  })
})
