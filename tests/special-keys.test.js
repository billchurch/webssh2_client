/**
 * Special Keys Data Tests
 * Validates key definitions used by the SpecialKeysPanel component
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { keyCategories } from '../client/src/components/special-keys-data.ts'

/**
 * Helper to find a key by label across all categories
 */
function findKey(label) {
  const allKeys = keyCategories.flatMap((c) => c.keys)
  return allKeys.find((k) => k.label === label) || null
}

describe('Special Keys Data', () => {
  it('should have at least one category', () => {
    assert.ok(keyCategories.length > 0, 'keyCategories should not be empty')
  })

  it('should have non-empty category names', () => {
    keyCategories.forEach((category) => {
      assert.ok(
        category.name.trim().length > 0,
        'Category name should not be empty'
      )
    })
  })

  it('should have at least one key per category', () => {
    keyCategories.forEach((category) => {
      assert.ok(
        category.keys.length > 0,
        `Category "${category.name}" should have at least one key`
      )
    })
  })

  it('should have non-empty labels for all keys', () => {
    keyCategories.forEach((category) => {
      category.keys.forEach((key) => {
        assert.ok(
          key.label.trim().length > 0,
          `Key in "${category.name}" has empty label`
        )
      })
    })
  })

  it('should have non-empty sequences for all keys', () => {
    keyCategories.forEach((category) => {
      category.keys.forEach((key) => {
        assert.ok(
          key.sequence.length > 0,
          `Key "${key.label}" in "${category.name}" has empty sequence`
        )
      })
    })
  })

  it('should have non-empty descriptions for all keys', () => {
    keyCategories.forEach((category) => {
      category.keys.forEach((key) => {
        assert.ok(
          key.description.trim().length > 0,
          `Key "${key.label}" in "${category.name}" has empty description`
        )
      })
    })
  })

  it('should have no duplicate labels within a category', () => {
    keyCategories.forEach((category) => {
      const labels = category.keys.map((k) => k.label)
      const uniqueLabels = new Set(labels)
      assert.strictEqual(
        labels.length,
        uniqueLabels.size,
        `Category "${category.name}" has duplicate labels`
      )
    })
  })

  describe('Known Control Codes', () => {
    it(String.raw`Ctrl+C should be \x03`, () => {
      const ctrlC = findKey('Ctrl+C')
      assert.ok(ctrlC, 'Ctrl+C should exist')
      assert.strictEqual(ctrlC.sequence, '\x03')
    })

    it(String.raw`Ctrl+D should be \x04`, () => {
      const ctrlD = findKey('Ctrl+D')
      assert.ok(ctrlD, 'Ctrl+D should exist')
      assert.strictEqual(ctrlD.sequence, '\x04')
    })

    it(String.raw`Ctrl+Z should be \x1a`, () => {
      const ctrlZ = findKey('Ctrl+Z')
      assert.ok(ctrlZ, 'Ctrl+Z should exist')
      assert.strictEqual(ctrlZ.sequence, '\x1a')
    })

    it(String.raw`Ctrl+\ should be \x1c`, () => {
      const ctrlBackslash = findKey('Ctrl+\\')
      assert.ok(ctrlBackslash, String.raw`Ctrl+\ should exist`)
      assert.strictEqual(ctrlBackslash.sequence, '\x1c')
    })

    it(String.raw`Ctrl+A should be \x01`, () => {
      const ctrlA = findKey('Ctrl+A')
      assert.ok(ctrlA, 'Ctrl+A should exist')
      assert.strictEqual(ctrlA.sequence, '\x01')
    })

    it(String.raw`Ctrl+E should be \x05`, () => {
      const ctrlE = findKey('Ctrl+E')
      assert.ok(ctrlE, 'Ctrl+E should exist')
      assert.strictEqual(ctrlE.sequence, '\x05')
    })

    it(String.raw`Escape should be \x1b`, () => {
      const esc = findKey('Escape')
      assert.ok(esc, 'Escape should exist')
      assert.strictEqual(esc.sequence, '\x1b')
    })

    it(String.raw`Tab should be \x09`, () => {
      const tab = findKey('Tab')
      assert.ok(tab, 'Tab should exist')
      assert.strictEqual(tab.sequence, '\x09')
    })
  })

  describe('Function Keys', () => {
    it('should have F1 through F12', () => {
      Array.from({ length: 12 }, (_, i) => i + 1).forEach((i) => {
        const fKey = findKey(`F${i}`)
        assert.ok(fKey, `F${i} should exist`)
      })
    })

    it(String.raw`function key sequences should start with \x1b`, () => {
      Array.from({ length: 12 }, (_, i) => i + 1).forEach((i) => {
        const fKey = findKey(`F${i}`)
        assert.ok(fKey, `F${i} should exist`)
        assert.ok(
          fKey.sequence.startsWith('\x1b'),
          String.raw`F${i} sequence should start with ESC (\x1b)`
        )
      })
    })
  })

  describe('Network Equipment Keys', () => {
    it(String.raw`Cisco abort (Ctrl+^) should be \x1e`, () => {
      const ctrlCaret = findKey('Ctrl+^')
      assert.ok(ctrlCaret, 'Ctrl+^ should exist')
      assert.strictEqual(ctrlCaret.sequence, '\x1e')
    })

    it(
      String.raw`Cisco escape to previous session (Ctrl+^ x) should be \x1ex`,
      () => {
        const ctrlCaretX = findKey('Ctrl+^ x')
        assert.ok(ctrlCaretX, 'Ctrl+^ x should exist')
        assert.strictEqual(ctrlCaretX.sequence, '\x1ex')
      }
    )
  })

  describe('Browser-Reserved Keys', () => {
    it('Ctrl+W should be marked as browser-reserved', () => {
      const ctrlW = findKey('Ctrl+W')
      assert.ok(ctrlW, 'Ctrl+W should exist')
      assert.strictEqual(ctrlW.browserReserved, true)
    })

    it(String.raw`Ctrl+B should be \x02 and browser-reserved`, () => {
      const ctrlB = findKey('Ctrl+B')
      assert.ok(ctrlB, 'Ctrl+B should exist')
      assert.strictEqual(ctrlB.sequence, '\x02')
      assert.strictEqual(ctrlB.browserReserved, true)
    })

    it('Ctrl+N should be marked as browser-reserved', () => {
      const ctrlN = findKey('Ctrl+N')
      assert.ok(ctrlN, 'Ctrl+N should exist')
      assert.strictEqual(ctrlN.browserReserved, true)
    })

    it('Ctrl+T should be marked as browser-reserved', () => {
      const ctrlT = findKey('Ctrl+T')
      assert.ok(ctrlT, 'Ctrl+T should exist')
      assert.strictEqual(ctrlT.browserReserved, true)
    })

    it('Ctrl+C should NOT be marked as browser-reserved', () => {
      const ctrlC = findKey('Ctrl+C')
      assert.ok(ctrlC, 'Ctrl+C should exist')
      assert.ok(!ctrlC.browserReserved, 'Ctrl+C should not be browser-reserved')
    })
  })
})
