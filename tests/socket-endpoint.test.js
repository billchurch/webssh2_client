/**
 * Tests for the Socket.IO endpoint and handshake built by the socket service.
 *
 * - getWebSocketUrl() honors an injected socket.url only when its host
 *   matches the page host (or an injected allowedHosts entry), and falls
 *   back to the same-origin URL otherwise.
 * - The handshake never carries the page's URL query parameters.
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'https://gateway.example.test/ssh/host/10.0.0.1?username=demo&password=S3cret'
})
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.localStorage = dom.window.localStorage

const { getWebSocketUrl, SocketService, socket } =
  await import('../client/src/services/socket.ts')

const httpsPage = {
  protocol: 'https:',
  host: 'gateway.example.test',
  hostname: 'gateway.example.test',
  port: ''
}

const httpPageWithPort = {
  protocol: 'http:',
  host: 'localhost:2222',
  hostname: 'localhost',
  port: '2222'
}

describe('getWebSocketUrl', () => {
  let originalWarn
  let warnings

  beforeEach(() => {
    warnings = []
    originalWarn = console.warn
    console.warn = (...args) => warnings.push(args.join(' '))
  })

  afterEach(() => {
    console.warn = originalWarn
  })

  it('uses the same-origin URL when no socket.url is configured', () => {
    assert.equal(
      getWebSocketUrl({ url: null }, httpsPage),
      'wss://gateway.example.test:443'
    )
    assert.equal(
      getWebSocketUrl(undefined, httpPageWithPort),
      'ws://localhost:2222'
    )
    assert.equal(
      getWebSocketUrl({ url: '' }, httpPageWithPort),
      'ws://localhost:2222'
    )
    assert.equal(warnings.length, 0)
  })

  it('honors a socket.url on the page host and rewrites the scheme', () => {
    assert.equal(
      getWebSocketUrl({ url: 'http://gateway.example.test' }, httpsPage),
      'wss://gateway.example.test'
    )
    assert.equal(
      getWebSocketUrl({ url: 'http://localhost:2222' }, httpPageWithPort),
      'ws://localhost:2222'
    )
    assert.equal(warnings.length, 0)
  })

  it('compares hosts case-insensitively', () => {
    assert.equal(
      getWebSocketUrl({ url: 'https://GATEWAY.example.test' }, httpsPage),
      'wss://gateway.example.test'
    )
  })

  it('falls back to the same-origin URL when the host differs', () => {
    assert.equal(
      getWebSocketUrl({ url: 'https://other.example.test' }, httpsPage),
      'wss://gateway.example.test:443'
    )
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /other\.example\.test/)
  })

  it('treats a different port as a different host', () => {
    assert.equal(
      getWebSocketUrl({ url: 'http://localhost:3333' }, httpPageWithPort),
      'ws://localhost:2222'
    )
    assert.equal(warnings.length, 1)
  })

  it('does not accept a host that only shares a suffix with the page host', () => {
    assert.equal(
      getWebSocketUrl(
        { url: 'https://gateway.example.test.other.test' },
        httpsPage
      ),
      'wss://gateway.example.test:443'
    )
    assert.equal(
      getWebSocketUrl({ url: 'https://user@other.test' }, httpsPage),
      'wss://gateway.example.test:443'
    )
  })

  it('returns only scheme and host, dropping path, query and fragment', () => {
    assert.equal(
      getWebSocketUrl(
        { url: 'https://gateway.example.test/[]/x?y=1#z' },
        httpsPage
      ),
      'wss://gateway.example.test'
    )
    assert.equal(
      getWebSocketUrl(
        { url: 'https://gateway.example.test/@other.test' },
        httpsPage
      ),
      'wss://gateway.example.test'
    )
  })

  it('rejects schemes other than http(s) and ws(s)', () => {
    for (const url of [
      'attacker.example://gateway.example.test',
      'javascript://gateway.example.test',
      'file://gateway.example.test/',
      'ftp://gateway.example.test'
    ]) {
      assert.equal(
        getWebSocketUrl({ url }, httpsPage),
        'wss://gateway.example.test:443',
        url
      )
    }
    assert.equal(warnings.length, 4)
  })

  it('rejects URLs carrying userinfo', () => {
    assert.equal(
      getWebSocketUrl(
        { url: 'https://other.test@gateway.example.test' },
        httpsPage
      ),
      'wss://gateway.example.test:443'
    )
    assert.equal(
      getWebSocketUrl(
        { url: 'https://user:pass@gateway.example.test' },
        httpsPage
      ),
      'wss://gateway.example.test:443'
    )
    assert.equal(warnings.length, 2)
  })

  it('honors a socket.url whose host is in allowedHosts', () => {
    assert.equal(
      getWebSocketUrl(
        {
          url: 'https://socket.example.test:8443',
          allowedHosts: ['Socket.example.test:8443']
        },
        httpsPage
      ),
      'wss://socket.example.test:8443'
    )
    assert.equal(warnings.length, 0)
  })

  it('rejects hosts that are not in allowedHosts', () => {
    assert.equal(
      getWebSocketUrl(
        {
          url: 'https://socket.example.test:9443',
          allowedHosts: ['socket.example.test:8443', 42]
        },
        httpsPage
      ),
      'wss://gateway.example.test:443'
    )
    assert.equal(
      getWebSocketUrl(
        {
          url: 'https://socket.example.test',
          allowedHosts: 'socket.example.test'
        },
        httpsPage
      ),
      'wss://gateway.example.test:443'
    )
    assert.equal(warnings.length, 2)
  })

  it('falls back to the same-origin URL when socket.url is not a valid URL', () => {
    assert.equal(
      getWebSocketUrl({ url: 'not a url' }, httpsPage),
      'wss://gateway.example.test:443'
    )
    assert.equal(warnings.length, 1)
  })

  it('reads window.location by default', () => {
    assert.equal(
      getWebSocketUrl({ url: 'https://other.example.test' }),
      'wss://gateway.example.test:443'
    )
  })
})

describe('Socket.IO handshake', () => {
  let service

  afterEach(() => {
    service?.closeConnection()
  })

  const connectWith = (socketUrl) => {
    service = new SocketService()
    const noop = () => {}
    service.initSocket(
      { socket: { url: socketUrl, path: '/ssh/socket.io' } },
      noop,
      noop,
      noop,
      noop,
      noop
    )
    const originalWarn = console.warn
    console.warn = () => {}
    try {
      return service.initializeSocketConnection()
    } finally {
      console.warn = originalWarn
    }
  }

  it('connects to the checked host for every socket.url shape', () => {
    const cases = [
      'https://gateway.example.test/[]',
      'https://gateway.example.test/[::1]',
      'https://gateway.example.test/@other.test',
      'https://gateway.example.test/?x=@other.test',
      'https://gateway.example.test#@other.test',
      'attacker.example://gateway.example.test',
      'https://other.test@gateway.example.test',
      'https://gateway.example.test:443',
      'https://other.example.test',
      'not a url'
    ]
    for (const socketUrl of cases) {
      const created = connectWith(socketUrl)
      const handshakeUrl = new URL(created.io.engine.transport.uri())
      assert.equal(handshakeUrl.host, 'gateway.example.test', socketUrl)
      assert.equal(handshakeUrl.pathname, '/ssh/socket.io/', socketUrl)
      service.closeConnection()
    }
  })

  it('does not forward page URL parameters in the handshake query', () => {
    service = new SocketService()
    const noop = () => {}
    service.initSocket(
      {
        socket: { url: 'https://other.example.test', path: '/ssh/socket.io' }
      },
      noop,
      noop,
      noop,
      noop,
      noop
    )
    const originalWarn = console.warn
    console.warn = () => {}
    let created
    try {
      created = service.initializeSocketConnection()
    } finally {
      console.warn = originalWarn
    }

    assert.equal(socket(), created)
    const manager = created.io
    assert.equal(manager.opts.query, undefined)
    assert.equal(manager.engine.hostname, 'gateway.example.test')
    const handshakeUrl = new URL(manager.engine.transport.uri())
    assert.equal(handshakeUrl.pathname, '/ssh/socket.io/')
    assert.deepEqual([...handshakeUrl.searchParams.keys()].sort(), [
      'EIO',
      'transport'
    ])
    assert.ok(!handshakeUrl.href.includes('S3cret'))
  })
})
