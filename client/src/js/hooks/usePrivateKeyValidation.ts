import type { Accessor } from 'solid-js'
import { createSignal, createMemo } from 'solid-js'
import { validatePrivateKey, validatePrivateKeyDeep } from '../utils.js'

export interface PrivateKeyValidationState {
  isValid: boolean
  format: 'OPENSSH' | 'PKCS8' | 'PKCS1-RSA' | 'EC' | 'DSA' | 'unknown'
  error?: string
  suggestion?: string
}

export function usePrivateKeyValidation(key: Accessor<string>) {
  const [validationState, setValidationState] =
    createSignal<PrivateKeyValidationState>({
      isValid: false,
      format: 'unknown'
    })

  const validate = createMemo(() => {
    const keyValue = key()

    // Empty key is valid (not required)
    if (!keyValue || keyValue.trim() === '') {
      setValidationState({ isValid: true, format: 'unknown' })
      return true
    }

    // Check for common mistakes
    if (
      keyValue.includes('ssh-rsa') ||
      keyValue.includes('ssh-ed25519') ||
      keyValue.includes('ecdsa-sha2')
    ) {
      setValidationState({
        isValid: false,
        format: 'unknown',
        error: 'This appears to be a public key',
        suggestion:
          'Please use your private key file instead (usually id_rsa, not id_rsa.pub)'
      })
      return false
    }

    // Basic validation
    if (!validatePrivateKey(keyValue)) {
      let error = 'Invalid private key format'
      let suggestion = ''

      if (keyValue.includes('BEGIN') && !keyValue.includes('PRIVATE')) {
        error = 'This is not a private key'
        suggestion = 'Look for a file without .pub extension'
      } else if (!keyValue.includes('BEGIN')) {
        error = 'Missing PEM headers'
        suggestion = 'Key should start with -----BEGIN PRIVATE KEY-----'
      }

      setValidationState({
        isValid: false,
        format: 'unknown',
        error,
        suggestion
      })
      return false
    }

    // Deep validation
    const deepResult = validatePrivateKeyDeep(keyValue)
    if (!deepResult) {
      setValidationState({
        isValid: false,
        format: 'unknown',
        error: 'Key structure is invalid',
        suggestion: 'The key appears corrupted or is in an unsupported format'
      })
      return false
    }

    // Valid key
    setValidationState({
      isValid: true,
      format: deepResult.format
    })
    return true
  })

  return {
    validationState,
    validate,
    isValid: () => validationState().isValid,
    format: () => validationState().format,
    error: () => validationState().error,
    suggestion: () => validationState().suggestion
  }
}
