/**
 * Regression tests for issue #167: bound what a directory listing can
 * cost the browser.
 *
 * - A listing keeps at most MAX_LISTING_ENTRIES (10,000) entries and the
 *   file browser shows a "Showing first 10,000 entries" notice.
 * - A name is shown cut to MAX_DISPLAY_NAME_LENGTH (255) characters, with
 *   the full name in `title`; operations still use the full name/path.
 * - The sorted listing is memoized: the sort runs once per change, not
 *   once per read.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'

await register('./tests/solid-browser-loader.mjs', pathToFileURL('./'))
await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/'
})
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.localStorage = dom.window.localStorage

const { MAX_LISTING_ENTRIES, MAX_DISPLAY_NAME_LENGTH, formatDisplayName } =
  await import('../client/src/types/sftp.ts')
const { setSocket } = await import('../client/src/services/socket.ts')
const { listDirectory, cleanupSftpListeners } =
  await import('../client/src/services/sftp-service.ts')
const { sftpStore } = await import('../client/src/stores/sftp-store.ts')

const readSource = (file) =>
  readFile(
    new URL(`../client/src/components/sftp/${file}`, import.meta.url),
    'utf8'
  )

function makeEntry(name, overrides = {}) {
  return {
    name,
    path: `/data/${name}`,
    type: 'file',
    size: 0,
    permissions: 'rw-r--r--',
    permissionsOctal: 0o644,
    owner: 'u',
    group: 'u',
    modifiedAt: '2026-01-01T00:00:00.000Z',
    accessedAt: '2026-01-01T00:00:00.000Z',
    isHidden: false,
    ...overrides
  }
}

function makeEntries(count) {
  return Array.from({ length: count }, (_, i) =>
    makeEntry(`f${String(i).padStart(6, '0')}`, { size: count - i })
  )
}

/** Minimal fake Socket.IO socket: records emits, lets tests inject events */
function createFakeSocket() {
  const handlers = new Map()
  const emitted = []
  return {
    on(event, handler) {
      handlers.set(event, handler)
    },
    off(event) {
      handlers.delete(event)
    },
    emit(event, payload) {
      emitted.push({ event, payload })
    },
    receive(event, payload) {
      const handler = handlers.get(event)
      assert.ok(handler, `no listener registered for ${event}`)
      handler(payload)
    },
    emitted
  }
}

describe('constants (issue #167)', () => {
  it('caps listings at 10,000 entries and names at 255 characters', () => {
    assert.strictEqual(MAX_LISTING_ENTRIES, 10_000)
    assert.strictEqual(MAX_DISPLAY_NAME_LENGTH, 255)
  })
})

describe('formatDisplayName (issue #167)', () => {
  it('keeps a name of up to 255 characters unchanged', () => {
    assert.strictEqual(formatDisplayName('report.txt'), 'report.txt')
    const exact = 'a'.repeat(255)
    assert.strictEqual(formatDisplayName(exact), exact)
  })

  it('cuts a longer name to 255 characters ending in an ellipsis', () => {
    const shown = formatDisplayName('b'.repeat(100_000))
    assert.strictEqual(Array.from(shown).length, 255)
    assert.ok(shown.endsWith('…'))
    assert.ok(shown.startsWith('b'.repeat(254)))
  })

  it('does not split a surrogate pair at the cut', () => {
    const emoji = '\u{1F600}'
    const shown = formatDisplayName(emoji.repeat(300))
    assert.strictEqual(Array.from(shown).length, 255)
    assert.strictEqual(shown, `${emoji.repeat(254)}…`)
  })
})

describe('listing cap and display (issue #167)', () => {
  let fakeSocket

  /** Navigate the store and answer with the given entries */
  async function loadListing(path, entries) {
    const navigation = sftpStore.navigateTo(path)
    fakeSocket.receive('sftp-directory', { path, entries })
    await navigation
  }

  beforeEach(() => {
    fakeSocket = createFakeSocket()
    setSocket(fakeSocket)
  })

  afterEach(() => {
    mock.restoreAll()
    sftpStore.reset()
    cleanupSftpListeners()
    setSocket(null)
  })

  it('listDirectory keeps the first 10,000 entries and flags truncation', async () => {
    const entries = makeEntries(MAX_LISTING_ENTRIES + 5)
    const listing = listDirectory('/big')
    fakeSocket.receive('sftp-directory', { path: '/big', entries })
    const result = await listing

    assert.strictEqual(result.entries.length, MAX_LISTING_ENTRIES)
    assert.strictEqual(result.truncated, true)
    assert.deepStrictEqual(
      result.entries.map((e) => e.name),
      entries.slice(0, MAX_LISTING_ENTRIES).map((e) => e.name)
    )
  })

  it('listDirectory does not flag a listing of exactly 10,000 entries', async () => {
    const listing = listDirectory('/full')
    fakeSocket.receive('sftp-directory', {
      path: '/full',
      entries: makeEntries(MAX_LISTING_ENTRIES)
    })
    const result = await listing

    assert.strictEqual(result.entries.length, MAX_LISTING_ENTRIES)
    assert.strictEqual(result.truncated, false)
  })

  it('the store shows a notice for a truncated listing and clears it after', async () => {
    await loadListing('/big', makeEntries(MAX_LISTING_ENTRIES + 1))

    assert.strictEqual(sftpStore.rawEntries.length, MAX_LISTING_ENTRIES)
    assert.strictEqual(sftpStore.entries.length, MAX_LISTING_ENTRIES)
    assert.strictEqual(sftpStore.listingTruncated, true)
    assert.strictEqual(sftpStore.notice, 'Showing first 10,000 entries')
    // The notice is not an error, so it does not auto-clear with errors
    assert.strictEqual(sftpStore.error, null)

    await loadListing('/small', makeEntries(3))
    assert.strictEqual(sftpStore.listingTruncated, false)
    assert.strictEqual(sftpStore.notice, null)
  })

  it('the FileBrowser banner renders the store notice', async () => {
    const source = await readSource('FileBrowser.tsx')
    assert.match(
      source,
      /<Show when=\{sftpStore\.notice\}>[\s\S]*?\{sftpStore\.notice\}[\s\S]*?<\/Show>/
    )
  })

  it('operations on a long-named entry use the full name and path', async () => {
    const longName = `${'n'.repeat(1000)}.txt`
    await loadListing('/data', [makeEntry(longName, { size: 4 })])

    const [entry] = sftpStore.entries
    assert.strictEqual(entry.name, longName)

    sftpStore.downloadFile(entry).catch(() => {})
    const start = fakeSocket.emitted.find(
      (e) => e.event === 'sftp-download-start'
    )
    assert.ok(start, 'download was requested')
    assert.strictEqual(start.payload.remotePath, `/data/${longName}`)
    const transfer = sftpStore.transfers.at(-1)
    assert.strictEqual(transfer.fileName, longName)

    sftpStore.deleteEntry(entry).catch(() => {})
    const del = fakeSocket.emitted.find((e) => e.event === 'sftp-delete')
    assert.ok(del, 'delete was requested')
    assert.strictEqual(del.payload.path, `/data/${longName}`)
  })

  it('components show the cut name and keep the full name in title', async () => {
    const entrySource = await readSource('FileEntry.tsx')
    assert.match(
      entrySource,
      /title=\{props\.entry\.name\}\s*>\s*\{displayName\(\)\}/
    )
    assert.match(entrySource, /formatDisplayName\(props\.entry\.name\)/)

    const modalSource = await readSource('FileInfoModal.tsx')
    assert.match(
      modalSource,
      /title=\{props\.entry\?\.name\}\s*>\s*\{displayName\(\)\}/
    )

    const transferSource = await readSource('TransferProgress.tsx')
    assert.match(
      transferSource,
      /title=\{props\.transfer\.fileName\}\s*>\s*\{formatDisplayName\(props\.transfer\.fileName\)\}/
    )

    // No raw name is rendered as text content anywhere in these components
    for (const source of [entrySource, modalSource, transferSource]) {
      assert.doesNotMatch(source, />\s*\{props\.entry\??\.name\}\s*</)
      assert.doesNotMatch(source, />\s*\{props\.transfer\.fileName\}\s*</)
    }
  })
})

describe('memoized sorting (issue #167)', () => {
  const originalSort = Array.prototype.sort
  let fakeSocket
  let sortCalls

  beforeEach(async () => {
    fakeSocket = createFakeSocket()
    setSocket(fakeSocket)
    const navigation = sftpStore.navigateTo('/sorted')
    fakeSocket.receive('sftp-directory', {
      path: '/sorted',
      entries: [
        makeEntry('b', { size: 1 }),
        makeEntry('c', { size: 3 }),
        makeEntry('a', { size: 2 }),
        makeEntry('dir', { type: 'directory' })
      ]
    })
    await navigation
    // mock.method() rejects arrays as targets, so count calls by hand
    sortCalls = 0
    Array.prototype.sort = function countedSort(...args) {
      sortCalls++
      return originalSort.apply(this, args)
    }
  })

  afterEach(() => {
    Array.prototype.sort = originalSort
    sftpStore.reset()
    cleanupSftpListeners()
    setSocket(null)
  })

  it('does not sort again when the listing is read many times', () => {
    const first = sftpStore.entries
    for (let i = 0; i < 50; i++) {
      assert.strictEqual(sftpStore.entries, first)
    }
    assert.strictEqual(sortCalls, 0)
    assert.deepStrictEqual(
      first.map((e) => e.name),
      ['dir', 'a', 'b', 'c']
    )
  })

  it('sorts once when the sort settings change', () => {
    const before = sftpStore.entries
    sftpStore.setSortBy('size')
    assert.strictEqual(sortCalls, 1)

    const after = sftpStore.entries
    assert.notStrictEqual(after, before)
    assert.deepStrictEqual(
      after.map((e) => e.name),
      ['dir', 'b', 'a', 'c']
    )
    for (let i = 0; i < 50; i++) sftpStore.entries
    assert.strictEqual(sortCalls, 1)

    // Same field again flips the direction: one more sort
    sftpStore.setSortBy('size')
    sftpStore.entries
    assert.strictEqual(sortCalls, 2)
    assert.deepStrictEqual(
      sftpStore.entries.map((e) => e.name),
      ['dir', 'c', 'a', 'b']
    )
  })

  it('sorts once when the entries change', async () => {
    const navigation = sftpStore.navigateTo('/other')
    fakeSocket.receive('sftp-directory', {
      path: '/other',
      entries: [makeEntry('z'), makeEntry('y')]
    })
    await navigation

    for (let i = 0; i < 50; i++) sftpStore.entries
    assert.strictEqual(sortCalls, 1)
    assert.deepStrictEqual(
      sftpStore.entries.map((e) => e.name),
      ['y', 'z']
    )
  })
})
