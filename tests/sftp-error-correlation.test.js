/**
 * Regression tests for issue #147:
 *
 * An `sftp-error` that arrives BEFORE the upload/download ready response
 * (e.g. server rejects a blocked file extension pre-transfer) must reject
 * the pending ready promise with the server-provided message. Previously
 * the error was only correlated against `activeTransfers` and the
 * `pendingRequests` map — never the `pendingUploadReady` /
 * `pendingDownloadReady` FIFO queues — so the transfer sat at
 * "Waiting... 0%" until the generic 30s "Upload ready timeout" fired.
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/'
})
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.localStorage = dom.window.localStorage

const { setSocket } = await import('../client/src/services/socket.ts')
const { uploadFile, downloadFile, cleanupSftpListeners } =
  await import('../client/src/services/sftp-service.ts')

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
    /** Simulate a server -> client event */
    receive(event, payload) {
      const handler = handlers.get(event)
      assert.ok(handler, `no listener registered for ${event}`)
      handler(payload)
    },
    emitted
  }
}

/**
 * Await a promise but give up after `ms`; returns the rejection message,
 * 'resolved', or 'still-pending'.
 */
function settlementWithin(promise, ms = 200) {
  return Promise.race([
    promise.then(
      () => 'resolved',
      (err) => err.message
    ),
    new Promise((resolve) => {
      setTimeout(() => resolve('still-pending'), ms).unref?.()
    })
  ])
}

async function waitFor(condition, timeoutMs = 1000) {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timed out')
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

describe('sftp-error correlation for pre-transfer rejections (issue #147)', () => {
  let fakeSocket

  beforeEach(() => {
    fakeSocket = createFakeSocket()
    setSocket(fakeSocket)
  })

  afterEach(() => {
    // Clears FIFO queues, pending requests, and their timeouts so the
    // test process is not held open by the 30s ready timeouts
    cleanupSftpListeners()
    setSocket(null)
  })

  it('rejects a pending upload with the server message when sftp-error arrives before sftp-upload-ready', async () => {
    const file = new File([new Uint8Array(16)], 'malicious.exe', {
      type: 'application/octet-stream'
    })

    const upload = uploadFile(file, '/home/testuser/malicious.exe')

    // The upload-start frame is emitted before awaiting the ready response
    assert.strictEqual(fakeSocket.emitted[0].event, 'sftp-upload-start')

    // Server rejects pre-transfer: transferId is set but the client never
    // saw it (no sftp-upload-ready was sent)
    fakeSocket.receive('sftp-error', {
      operation: 'upload',
      code: 'SFTP_EXTENSION_BLOCKED',
      message: 'File extension .exe is not allowed',
      path: '/home/testuser/malicious.exe',
      transferId: '7f349eb1-bf1b-4a0c-be6b-befbf71eeb86',
      fileName: 'malicious.exe'
    })

    assert.strictEqual(
      await settlementWithin(upload),
      'File extension .exe is not allowed'
    )
  })

  it('rejects a pending download with the server message when sftp-error arrives before sftp-download-ready', async () => {
    const download = downloadFile('/home/testuser/secret.txt')

    assert.strictEqual(fakeSocket.emitted[0].event, 'sftp-download-start')

    fakeSocket.receive('sftp-error', {
      operation: 'download',
      code: 'SFTP_PATH_BLOCKED',
      message: 'Path is not allowed',
      path: '/home/testuser/secret.txt',
      transferId: '11111111-2222-3333-4444-555555555555'
    })

    assert.strictEqual(await settlementWithin(download), 'Path is not allowed')
  })

  it('does not reject a queued upload when the error belongs to an active transfer', async () => {
    const fileA = new File([new Uint8Array(16)], 'a.bin')
    const uploadA = uploadFile(fileA, '/home/testuser/a.bin')

    // Server accepts upload A; it becomes an active transfer
    fakeSocket.receive('sftp-upload-ready', {
      transferId: 'transfer-a',
      chunkSize: 32768
    })

    // Wait until A has sent its first chunk (it is now mid-transfer)
    await waitFor(() =>
      fakeSocket.emitted.some((e) => e.event === 'sftp-upload-chunk')
    )

    // Upload B is now queued, waiting for its own ready response
    const fileB = new File([new Uint8Array(16)], 'b.bin')
    const uploadB = uploadFile(fileB, '/home/testuser/b.bin')

    // Mid-transfer failure for A must not consume B's queued ready promise
    fakeSocket.receive('sftp-error', {
      operation: 'upload',
      code: 'SFTP_WRITE_FAILED',
      message: 'disk full',
      path: '/home/testuser/a.bin',
      transferId: 'transfer-a'
    })

    assert.strictEqual(await settlementWithin(uploadA), 'disk full')
    assert.strictEqual(await settlementWithin(uploadB), 'still-pending')
  })
})
