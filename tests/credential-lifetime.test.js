/**
 * Tests for how long the client keeps login credentials in memory (#158).
 *
 * - The socket service drops its stored login payload after a successful
 *   login unless reconnect is allowed, and always on closeConnection(),
 *   auth_failed and a server disconnect without reconnect.
 * - With allowReconnect the payload survives a disconnect, so reconnect
 *   can authenticate again without the login modal.
 * - The LoginModal empties its password, private key and passphrase
 *   fields when it closes.
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'https://gateway.example.test/ssh'
})
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.localStorage = dom.window.localStorage

const { SocketService, socket } =
  await import('../client/src/services/socket.ts')
const { setState } = await import('../client/src/stores/terminal.ts')
const { clearSecretFields, LOGIN_SECRET_FIELDS } =
  await import('../client/src/utils/login-form.ts')

const LOGIN = {
  host: 'ssh.example.test',
  port: 22,
  username: 'demo',
  password: 'S3cret',
  privateKey:
    '-----BEGIN OPENSSH PRIVATE KEY-----\nAAAA\n-----END OPENSSH PRIVATE KEY-----',
  passphrase: 'k3y-pass'
}

// Call the listener the service registered for a server event
const fire = (sock, event, ...args) => {
  const listeners = sock.listeners(event)
  assert.ok(listeners.length > 0, `no listener for ${event}`)
  for (const listener of listeners) listener(...args)
}

describe('socket service credential lifetime', () => {
  let service
  let sock
  let emitted
  let disconnects

  // Start a login the way app.tsx does: store the form, then connect
  const login = (formData = LOGIN) => {
    service.setFormData(formData)
    sock = service.initializeSocketConnection()
    emitted = []
    sock.emit = (event, payload) => {
      emitted.push({ event, payload })
      return sock
    }
    return sock
  }

  // Ask the service to authenticate and return what it sent
  const requestAuth = () => {
    emitted = []
    fire(sock, 'authentication', { action: 'request_auth' })
    return emitted.find((e) => e.event === 'authenticate')?.payload
  }

  const authSuccess = (permissions) => {
    fire(sock, 'authentication', { action: 'auth_result', success: true })
    if (permissions) fire(sock, 'permissions', permissions)
  }

  beforeEach(() => {
    setState('allowReconnect', false)
    setState('isBasicAuthCookiePresent', false)
    disconnects = []
    service = new SocketService()
    const noop = () => {}
    service.initSocket(
      { socket: { path: '/ssh/socket.io' } },
      noop,
      (reason) => disconnects.push(reason),
      noop,
      noop,
      noop
    )
  })

  afterEach(() => {
    service.closeConnection()
    setState('allowReconnect', false)
    setState('isBasicAuthCookiePresent', false)
  })

  it('sends the stored credentials when the server asks for them', () => {
    login()
    const payload = requestAuth()
    assert.equal(payload.password, LOGIN.password)
    assert.equal(payload.privateKey, LOGIN.privateKey)
    assert.equal(payload.passphrase, LOGIN.passphrase)
  })

  it('clears credentials after a successful login without reconnect', () => {
    login()
    requestAuth()
    authSuccess({ allowReconnect: false, allowReplay: true })
    assert.equal(service.hasStoredCredentials(), false)
  })

  it('waits for the reconnect permission before clearing', () => {
    // The server sends 'permissions' after 'auth_result'
    login()
    requestAuth()
    authSuccess()
    assert.equal(service.hasStoredCredentials(), true)
    fire(sock, 'permissions', { allowReconnect: false })
    assert.equal(service.hasStoredCredentials(), false)
  })

  it('keeps credentials after login while reconnect is allowed', () => {
    login()
    requestAuth()
    authSuccess({ allowReconnect: true })
    assert.equal(service.hasStoredCredentials(), true)
  })

  it('clears credentials once reconnect is no longer allowed', () => {
    login()
    requestAuth()
    authSuccess({ allowReconnect: true })
    fire(sock, 'permissions', { allowReconnect: false })
    assert.equal(service.hasStoredCredentials(), false)
  })

  it('does not keep credentials for reconnect under Basic Auth', () => {
    setState('isBasicAuthCookiePresent', true)
    login()
    requestAuth()
    authSuccess({ allowReconnect: true })
    assert.equal(service.hasStoredCredentials(), false)
  })

  it('reconnects with the stored credentials when reconnect is allowed', () => {
    login()
    requestAuth()
    authSuccess({ allowReconnect: true })
    fire(sock, 'disconnect', 'transport close')
    assert.equal(service.hasStoredCredentials(), true)
    assert.deepEqual(disconnects, ['transport close'])

    // handleReconnect() in app.tsx connects again without form data
    sock = service.initializeSocketConnection()
    sock.emit = (event, payload) => {
      emitted.push({ event, payload })
      return sock
    }
    const payload = requestAuth()
    assert.equal(payload.username, LOGIN.username)
    assert.equal(payload.password, LOGIN.password)
    assert.equal(payload.privateKey, LOGIN.privateKey)
    assert.equal(payload.passphrase, LOGIN.passphrase)
  })

  it('clears credentials on a server disconnect without reconnect', () => {
    login()
    requestAuth()
    fire(sock, 'disconnect', 'transport close')
    assert.equal(service.hasStoredCredentials(), false)
  })

  it('always clears credentials on auth_failed', () => {
    setState('allowReconnect', true)
    login()
    requestAuth()
    fire(sock, 'authentication', {
      action: 'auth_result',
      success: false,
      message: 'Permission denied'
    })
    assert.equal(service.hasStoredCredentials(), false)
    assert.deepEqual(disconnects, ['auth_failed'])
  })

  it('always clears credentials on closeConnection()', () => {
    setState('allowReconnect', true)
    login()
    requestAuth()
    authSuccess({ allowReconnect: true })
    service.closeConnection()
    assert.equal(service.hasStoredCredentials(), false)
    assert.equal(socket(), null)
  })

  it('keeps the new payload when a connection replaces an old one', () => {
    login()
    login({ ...LOGIN, password: 'N3w-secret' })
    // Closing the old socket must not wipe the payload for the new one
    fire(sock, 'disconnect', 'io client disconnect')
    assert.equal(service.hasStoredCredentials(), true)
    assert.equal(requestAuth().password, 'N3w-secret')
  })
})

describe('LoginModal secret fields', () => {
  it('clearSecretFields empties password, private key and passphrase', () => {
    const cleared = clearSecretFields(LOGIN)
    assert.deepEqual(cleared, {
      host: LOGIN.host,
      port: LOGIN.port,
      username: LOGIN.username,
      password: '',
      privateKey: '',
      passphrase: ''
    })
    assert.deepEqual([...LOGIN_SECRET_FIELDS].sort(), [
      'passphrase',
      'password',
      'privateKey'
    ])
  })

  it('clearSecretFields does not change the input object', () => {
    const input = { ...LOGIN }
    clearSecretFields(input)
    assert.deepEqual(input, LOGIN)
  })

  it('the modal clears its secret fields when it closes', async () => {
    const source = await readFile(
      new URL('../client/src/components/LoginModal.tsx', import.meta.url),
      'utf8'
    )
    assert.match(
      source,
      /on\(\s*\(\) => props\.isOpen,\s*\(isOpen\) => \{\s*if \(!isOpen\) \{[\s\S]*?setFormData\(clearSecretFields\)/,
      'LoginModal must reset secret fields when isOpen becomes false'
    )
  })
})
