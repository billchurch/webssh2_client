import type { Component } from 'solid-js'
import { createSignal, createEffect, createMemo, For, Show } from 'solid-js'
import createDebug from 'debug'
import { Modal } from './Modal'
import { Key, Settings, Upload, Info, Lock } from 'lucide-solid'
import { usePrivateKeyValidation } from '../hooks/usePrivateKeyValidation'
import { createFieldValidator, ValidationRules } from '../utils/validation'
import type { ClientAuthenticatePayload } from '../types/events.d'
import type { SSHAuthMethod, ConnectionMode } from '../types/config.d'
import { DEFAULT_AUTH_METHODS } from '../constants.js'

const debug = createDebug('webssh2-client:login-modal')

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: Partial<ClientAuthenticatePayload>) => void
  onOptionsClick?: () => void
  initialValues?: Partial<ClientAuthenticatePayload> | undefined
  allowedAuthMethods: SSHAuthMethod[]
  authMethodLoadFailed?: boolean
  errorMessage?: string | null
  /** Connection mode: 'full' allows editing host/port, 'host-locked' restricts to credentials only */
  connectionMode?: ConnectionMode
  /** Host that cannot be changed (when connectionMode is 'host-locked') */
  lockedHost?: string
  /** Port that cannot be changed (when connectionMode is 'host-locked') */
  lockedPort?: number
}

export const LoginModal: Component<LoginModalProps> = (props) => {
  debug('LoginModal render', { isOpen: props.isOpen })

  // Debug the props reactivity
  createEffect(() => {
    debug('LoginModal isOpen changed:', props.isOpen)
  })
  const [formData, setFormData] = createSignal<
    Partial<ClientAuthenticatePayload>
  >({
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKey: '',
    passphrase: ''
  })

  const [showPrivateKeySection, setShowPrivateKeySection] = createSignal(false)
  const [capsLockActive, setCapsLockActive] = createSignal(false)

  // Refs for input elements
  let hostInputRef: HTMLInputElement | undefined
  let portInputRef: HTMLInputElement | undefined
  let usernameInputRef: HTMLInputElement | undefined
  let passwordInputRef: HTMLInputElement | undefined

  // Reactive private key validation
  const privateKeyValidation = usePrivateKeyValidation(
    () => formData().privateKey || ''
  )

  // Field validators for other fields
  // Use effectiveHost for validation (handles host-locked mode)
  const hostValidator = createFieldValidator(
    () => {
      // If host is locked, use locked value for validation
      if (props.connectionMode === 'host-locked' && props.lockedHost !== undefined) {
        return props.lockedHost
      }
      return formData().host || ''
    },
    [ValidationRules.required(), ValidationRules.hostname()]
  )

  const usernameValidator = createFieldValidator(
    () => formData().username || '',
    [ValidationRules.required()]
  )

  // Initialize form data with initial values
  createEffect(() => {
    if (props.initialValues) {
      setFormData((prev) => ({ ...prev, ...props.initialValues }))
    }
  })

  // Auto-focus on the first empty field when modal opens
  createEffect(() => {
    if (props.isOpen) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const data = formData()
        const hostLocked = isHostLocked()

        // Priority order: host → port → username → password
        // Skip host/port if they're locked
        if (!hostLocked && (!data.host || data.host.trim() === '')) {
          hostInputRef?.focus()
          debug('Auto-focused host field')
        } else if (!hostLocked && (!data.port || data.port === 0)) {
          // Port is unlikely to be empty since default is 22, but check if it's actually empty/0
          portInputRef?.focus()
          debug('Auto-focused port field')
        } else if (!data.username || data.username.trim() === '') {
          usernameInputRef?.focus()
          debug('Auto-focused username field')
        } else if (supportsPassword()) {
          // Default to password field if host and username are filled
          passwordInputRef?.focus()
          debug('Auto-focused password field')
        }
      }, 100)
    }
  })

  // Handle caps lock detection
  const handleKeyDown = (e: KeyboardEvent) => {
    setCapsLockActive(e.getModifierState('CapsLock'))
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    setCapsLockActive(e.getModifierState('CapsLock'))
  }

  const updateFormData = <K extends keyof ClientAuthenticatePayload>(
    key: K,
    value: ClientAuthenticatePayload[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const allowedMethods = createMemo(() =>
    props.allowedAuthMethods && props.allowedAuthMethods.length > 0
      ? props.allowedAuthMethods
      : DEFAULT_AUTH_METHODS
  )

  const supportsPassword = createMemo(() =>
    allowedMethods().includes('password')
  )
  const supportsPublicKey = createMemo(() =>
    allowedMethods().includes('publickey')
  )
  const enforcePrivateKeyOnly = createMemo(
    () => supportsPublicKey() && !supportsPassword()
  )
  const shouldShowPrivateKey = createMemo(
    () =>
      supportsPublicKey() &&
      (enforcePrivateKeyOnly() || showPrivateKeySection())
  )
  const methodRestrictionActive = createMemo(() =>
    DEFAULT_AUTH_METHODS.some((method) => !allowedMethods().includes(method))
  )
  const authLoadFailed = createMemo(() => Boolean(props.authMethodLoadFailed))

  // Connection mode memos
  const isHostLocked = createMemo(
    () => props.connectionMode === 'host-locked'
  )
  const effectiveHost = createMemo(() =>
    isHostLocked() && props.lockedHost !== undefined
      ? props.lockedHost
      : formData().host || ''
  )
  const effectivePort = createMemo(() =>
    isHostLocked() && props.lockedPort !== undefined
      ? props.lockedPort
      : formData().port || 22
  )

  createEffect(() => {
    if (!supportsPublicKey()) {
      setShowPrivateKeySection(false)
      setFormData((prev) => ({
        ...prev,
        privateKey: '',
        passphrase: ''
      }))
    }
  })

  createEffect(() => {
    if (!supportsPassword()) {
      setFormData((prev) => ({
        ...prev,
        password: ''
      }))
    }
  })

  createEffect(() => {
    if (enforcePrivateKeyOnly()) {
      setShowPrivateKeySection(true)
    }
  })

  const handleFileUpload = async (e: Event) => {
    if (!supportsPublicKey()) return
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      try {
        const content = await file.text()
        updateFormData('privateKey', content)
        // Validation happens automatically via reactive privateKeyValidation hook
      } catch (error) {
        debug('Error reading private key file:', error)
        alert('Error reading private key file')
      }
    }
  }

  // Form validation
  const isFormValid = () => {
    const data = formData()
    const passwordValue = typeof data.password === 'string' ? data.password : ''
    const privateKeyValue =
      typeof data.privateKey === 'string' ? data.privateKey : ''

    const hasPassword = supportsPassword() && passwordValue.trim().length > 0
    const hasPrivateKey =
      supportsPublicKey() && privateKeyValue.trim().length > 0

    let credentialsValid = true
    if (supportsPassword() && supportsPublicKey()) {
      credentialsValid =
        hasPassword || (hasPrivateKey && privateKeyValidation.isValid())
    } else if (supportsPassword()) {
      credentialsValid = hasPassword
    } else if (supportsPublicKey()) {
      credentialsValid = hasPrivateKey && privateKeyValidation.isValid()
    }

    return (
      hostValidator.validate() &&
      usernameValidator.validate() &&
      credentialsValid
    )
  }

  const togglePrivateKeyVisibility = () => {
    const next = !showPrivateKeySection()
    setShowPrivateKeySection(next)

    if (!next) {
      setFormData((prev) => ({
        ...prev,
        privateKey: '',
        passphrase: ''
      }))
    }
  }

  const buildSubmitPayload = (): Partial<ClientAuthenticatePayload> => {
    const data = formData()
    const payload: Partial<ClientAuthenticatePayload> = {}

    // Use locked host/port if in host-locked mode, otherwise use form data
    if (isHostLocked()) {
      if (props.lockedHost !== undefined) {
        payload.host = props.lockedHost
      }
      if (props.lockedPort !== undefined) {
        payload.port = props.lockedPort
      }
    } else {
      if (typeof data.host === 'string' && data.host.trim().length > 0) {
        payload.host = data.host.trim()
      }
      if (typeof data.port === 'number') {
        payload.port = data.port
      }
    }

    if (typeof data.username === 'string' && data.username.trim().length > 0) {
      payload.username = data.username.trim()
    }

    if (
      supportsPassword() &&
      typeof data.password === 'string' &&
      data.password.trim().length > 0
    ) {
      payload.password = data.password
    }

    if (
      supportsPublicKey() &&
      typeof data.privateKey === 'string' &&
      data.privateKey.trim().length > 0 &&
      privateKeyValidation.isValid()
    ) {
      payload.privateKey = data.privateKey
      if (
        typeof data.passphrase === 'string' &&
        data.passphrase.trim().length > 0
      ) {
        payload.passphrase = data.passphrase
      }
    }

    return payload
  }

  const renderOptionsRow = (includeKeyToggle: boolean) => (
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        {includeKeyToggle && (
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-slate-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            onClick={togglePrivateKeyVisibility}
          >
            <Key class="mr-2 inline-block size-4" />
            {shouldShowPrivateKey() ? 'Hide SSH Key' : 'Add SSH Key'}
          </button>
        )}
        {methodRestrictionActive() && (
          <span
            class="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
            title="Some methods are disabled by the administrator"
          >
            <Info class="mr-1 inline-block size-4" aria-hidden="true" />
            Admin limited
            <span class="sr-only">
              Some methods are disabled by the administrator
            </span>
          </span>
        )}
        {authLoadFailed() && (
          <output
            class="text-xs text-amber-600"
            title="Server config unavailable; showing default methods"
          >
            Using defaults; server config unavailable
          </output>
        )}
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-md border border-transparent bg-slate-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        onClick={() => props.onOptionsClick?.()}
        aria-label="Options"
        title="Options"
      >
        <Settings class="mr-2 inline-block size-4" /> Options
      </button>
    </div>
  )

  const renderPrivateKeySection = () => (
    <div class={shouldShowPrivateKey() ? '' : 'hidden'}>
      <div class="mt-2 rounded border border-neutral-300 bg-neutral-50 p-3 text-neutral-800">
        <div class="relative">
          <label for="privateKeyText" class="sr-only">
            Private Key
          </label>
          <textarea
            id="privateKeyText"
            name="privateKey"
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            placeholder="Paste your private key here"
            rows={3}
            class="mb-2 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            classList={{
              'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400':
                !formData().privateKey,
              'border-red-500 bg-red-50 text-slate-900 placeholder:text-slate-400':
                Boolean(
                  formData().privateKey && !privateKeyValidation.isValid()
                ),
              'border-green-500 bg-green-50 text-slate-900 placeholder:text-slate-400':
                Boolean(formData().privateKey && privateKeyValidation.isValid())
            }}
            value={formData().privateKey || ''}
            onInput={(e) => updateFormData('privateKey', e.currentTarget.value)}
          ></textarea>

          {/* Validation status indicator */}
          {formData().privateKey && (
            <div class="absolute right-2 top-2">
              {privateKeyValidation.isValid() ? (
                <span
                  class="text-green-500"
                  title={`Valid ${privateKeyValidation.format()} key`}
                >
                  ✓
                </span>
              ) : (
                <span class="text-red-500" title={privateKeyValidation.error()}>
                  ✗
                </span>
              )}
            </div>
          )}
        </div>

        {/* Validation error message */}
        {formData().privateKey && !privateKeyValidation.isValid() && (
          <div class="mb-2 text-sm">
            <p class="text-red-600">{privateKeyValidation.error()}</p>
            {privateKeyValidation.suggestion() && (
              <p class="mt-1 text-gray-600">
                {privateKeyValidation.suggestion()}
              </p>
            )}
          </div>
        )}

        {/* Key format badge */}
        {formData().privateKey && privateKeyValidation.isValid() && (
          <div class="mb-2">
            <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
              {privateKeyValidation.format()} format detected
            </span>
          </div>
        )}

        <div class="mb-2">
          <input
            type="file"
            id="privateKeyFile"
            class="sr-only"
            onChange={handleFileUpload}
          />
          <label
            for="privateKeyFile"
            class="inline-flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-slate-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <Upload class="mr-2 inline-block size-4" /> Upload Key File
          </label>
        </div>

        <div>
          <label for="passphraseInput" class="sr-only">
            Key Passphrase
          </label>
          <input
            type="password"
            id="passphraseInput"
            name="passphrase"
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            enterkeyhint="go"
            placeholder="Key password (if encrypted)"
            class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData().passphrase || ''}
            onInput={(e) => updateFormData('passphrase', e.currentTarget.value)}
          />
        </div>
      </div>
    </div>
  )

  const renderKeyboardInteractiveNotice = () => (
    <div class="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
      Additional prompts may appear after connecting. Follow the on-screen
      instructions to complete keyboard interactive authentication.
    </div>
  )

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (!isFormValid()) {
      debug('Form validation failed')
      return
    }
    props.onSubmit(buildSubmitPayload())
    props.onClose()
  }

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      showCloseButton={false}
      closeOnBackdropClick={false}
    >
      <div class="relative w-80 rounded-md border border-neutral-300 bg-white p-6 text-slate-800 shadow-md sm:w-[28rem]">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">WebSSH2 Login</h2>
        <Show when={props.errorMessage}>
          <div
            class="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            <span class="font-medium">Connection failed: </span>
            {props.errorMessage}
          </div>
        </Show>
        <form onSubmit={handleSubmit} class="space-y-3">
          {/* Host/Port locked indicator */}
          <Show when={isHostLocked()}>
            <div class="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Lock class="size-4 text-slate-400" />
              <span>
                Connecting to{' '}
                <span class="font-medium text-slate-800">
                  {effectiveHost()}:{effectivePort()}
                </span>
              </span>
            </div>
          </Show>

          {/* Host */}
          <Show when={!isHostLocked()}>
            <div>
              <label for="hostInput" class="sr-only">
                Host
              </label>
              <input
                ref={hostInputRef}
                type="text"
                id="hostInput"
                name="host"
                placeholder="Host"
                required
                autocomplete="off"
                autocapitalize="off"
                spellcheck={false}
                enterkeyhint="next"
                class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData().host || ''}
                onInput={(e) => updateFormData('host', e.currentTarget.value)}
              />
            </div>
          </Show>

          {/* Port */}
          <Show when={!isHostLocked()}>
            <div>
              <label for="portInput" class="sr-only">
                Port
              </label>
              <input
                ref={portInputRef}
                type="text"
                id="portInput"
                name="port"
                placeholder="Port"
                autocomplete="off"
                autocapitalize="off"
                spellcheck={false}
                enterkeyhint="next"
                inputmode="numeric"
                pattern="[0-9]*"
                class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData().port || '22'}
                onInput={(e) =>
                  updateFormData(
                    'port',
                    Number.parseInt(e.currentTarget.value, 10) || 22
                  )
                }
              />
            </div>
          </Show>

          {/* Username */}
          <div>
            <label for="usernameInput" class="sr-only">
              Username
            </label>
            <input
              ref={usernameInputRef}
              type="text"
              id="usernameInput"
              name="username"
              placeholder="Username"
              required
              autocomplete="username"
              autocapitalize="off"
              spellcheck={false}
              enterkeyhint="next"
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData().username || ''}
              onInput={(e) => updateFormData('username', e.currentTarget.value)}
            />
          </div>

          <For each={allowedMethods()}>
            {(method) => {
              if (method === 'password') {
                return (
                  <div class="relative w-full">
                    <label for="passwordInput" class="sr-only">
                      Password
                    </label>
                    <input
                      ref={passwordInputRef}
                      type="password"
                      id="passwordInput"
                      name="password"
                      placeholder="Password"
                      autocomplete="current-password"
                      autocapitalize="off"
                      spellcheck={false}
                      enterkeyhint="go"
                      class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData().password || ''}
                      onInput={(e) =>
                        updateFormData('password', e.currentTarget.value)
                      }
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleKeyUp}
                    />
                    <span
                      class={`${capsLockActive() ? '' : 'hidden'} pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-red-500`}
                    >
                      ⇪
                    </span>
                  </div>
                )
              }
              if (method === 'publickey') {
                return (
                  <>
                    {renderOptionsRow(!enforcePrivateKeyOnly())}
                    {renderPrivateKeySection()}
                  </>
                )
              }
              if (method === 'keyboard-interactive') {
                return renderKeyboardInteractiveNotice()
              }
              return null
            }}
          </For>

          {!supportsPublicKey() && renderOptionsRow(false)}

          {/* Submit button */}
          <div class="mt-4">
            <button
              type="submit"
              disabled={!isFormValid()}
              class="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              Connect
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
