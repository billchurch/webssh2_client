import type { Component } from 'solid-js'
import { createSignal, createEffect } from 'solid-js'
import createDebug from 'debug'
import { Modal } from './Modal'
import { Key, Settings, Upload } from 'lucide-solid'
import { usePrivateKeyValidation } from '../hooks/usePrivateKeyValidation'
import { createFieldValidator, ValidationRules } from '../utils/validation'
import type { ClientAuthenticatePayload } from '../types/events.d'

const debug = createDebug('webssh2-client:login-modal')

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: Partial<ClientAuthenticatePayload>) => void
  onOptionsClick?: () => void
  initialValues?: Partial<ClientAuthenticatePayload> | undefined
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
  const hostValidator = createFieldValidator(
    () => formData().host || '',
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

        // Priority order: host → port → username → password
        if (!data.host || data.host.trim() === '') {
          hostInputRef?.focus()
          debug('Auto-focused host field')
        } else if (!data.port || data.port === 0) {
          // Port is unlikely to be empty since default is 22, but check if it's actually empty/0
          portInputRef?.focus()
          debug('Auto-focused port field')
        } else if (!data.username || data.username.trim() === '') {
          usernameInputRef?.focus()
          debug('Auto-focused username field')
        } else {
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

  const handleFileUpload = async (e: Event) => {
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
    const hasCredentials = formData().password || formData().privateKey
    return (
      hostValidator.validate() &&
      usernameValidator.validate() &&
      hasCredentials &&
      (formData().privateKey ? privateKeyValidation.isValid() : true)
    )
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (!isFormValid()) {
      debug('Form validation failed')
      return
    }
    props.onSubmit(formData())
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
        <form onSubmit={handleSubmit} class="space-y-3">
          {/* Host */}
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

          {/* Port */}
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
                  parseInt(e.currentTarget.value, 10) || 22
                )
              }
            />
          </div>

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

          {/* Password */}
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
              onInput={(e) => updateFormData('password', e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
            />
            <span
              class={`${capsLockActive() ? '' : 'hidden'} pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-red-500`}
            >
              ⇪
            </span>
          </div>

          {/* Options row */}
          <div class="flex items-center justify-between gap-2">
            <div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-md border border-transparent bg-slate-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                onClick={() =>
                  setShowPrivateKeySection(!showPrivateKeySection())
                }
              >
                <Key class="mr-2 inline-block size-4" />
                {showPrivateKeySection() ? 'Hide SSH Key' : 'Add SSH Key'}
              </button>
            </div>
            <div>
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
          </div>

          {/* Private key section */}
          <div class={showPrivateKeySection() ? '' : 'hidden'}>
            <div class="mt-2 rounded border border-neutral-300 bg-neutral-50 p-3 text-neutral-800">
              <label for="privateKeyText" class="sr-only">
                Private Key
              </label>
              <div class="relative">
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
                      Boolean(
                        formData().privateKey && privateKeyValidation.isValid()
                      )
                  }}
                  value={formData().privateKey || ''}
                  onInput={(e) =>
                    updateFormData('privateKey', e.currentTarget.value)
                  }
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
                      <span
                        class="text-red-500"
                        title={privateKeyValidation.error()}
                      >
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
                onInput={(e) =>
                  updateFormData('passphrase', e.currentTarget.value)
                }
              />
            </div>
          </div>

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
