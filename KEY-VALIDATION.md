# Private Key Validation - SolidJS Implementation Plan

## Current State Analysis

### Existing Validation Functions

The codebase already has comprehensive private key validation in `/client/src/js/utils.ts`:

1. **`validatePrivateKey()`** (lines 325-344)
   - Validates PEM structure and headers/footers
   - Supports multiple formats: OpenSSH, PKCS#8, PKCS#1 RSA, EC, DSA

2. **`validatePrivateKeyDeep()`** (lines 353-431)
   - Decodes and validates base64 payload
   - OpenSSH keys: Verifies "openssh-key-v1\0" magic string
   - DER keys: Verifies 0x30 SEQUENCE tag at start
   - Returns format type if valid

### Current Implementation Issues

- Validation only happens on file upload in `LoginModal.tsx`
- Uses basic `alert()` for error messages
- No real-time validation when pasting/typing
- Existing SolidJS validation framework (`utils/validation.ts`) is not utilized
- No visual feedback during input

## Proposed SolidJS-Style Implementation

### 1. Extend Validation Rules (`utils/validation.ts`)

```typescript
// Add to ValidationRules object
privateKey: (message = 'Invalid private key format'): ValidationRule<string> => ({
  message,
  validate: (value) => validatePrivateKey(value)
}),

privateKeyDeep: (message = 'Private key appears malformed or unsupported'): ValidationRule<string> => ({
  message,
  validate: (value) => validatePrivateKeyDeep(value) !== null
}),

privateKeyWithDetails: (): ValidationRule<string> => ({
  message: getKeyValidationMessage,
  validate: (value) => {
    if (!value) return true // Empty is ok
    return validatePrivateKey(value) && validatePrivateKeyDeep(value) !== null
  }
})
```

### 2. Create Private Key Validation Hook

Create new file: `client/src/js/hooks/usePrivateKeyValidation.ts`

```typescript
import { createSignal, createMemo, Accessor } from 'solid-js'
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
```

### 3. Update LoginModal Component

```typescript
import { usePrivateKeyValidation } from '../hooks/usePrivateKeyValidation'
import { createFieldValidator, ValidationRules } from '../utils/validation'

export const LoginModal: Component<LoginModalProps> = (props) => {
  // ... existing code ...

  // Add reactive validation
  const privateKeyValidation = usePrivateKeyValidation(() => formData().privateKey || '')

  // Add field validators for other fields
  const hostValidator = createFieldValidator(
    () => formData().host || '',
    [ValidationRules.required(), ValidationRules.hostname()]
  )

  const usernameValidator = createFieldValidator(
    () => formData().username || '',
    [ValidationRules.required()]
  )

  // Handle private key input with validation
  const handlePrivateKeyInput = (value: string) => {
    updateFormData('privateKey', value)
    // Validation happens automatically via reactive memo
  }

  const handleFileUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      try {
        const content = await file.text()
        updateFormData('privateKey', content)
        // Validation happens automatically
      } catch (error) {
        console.error('Error reading private key file:', error)
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

  // ... in the JSX ...

  {/* Private key textarea with validation feedback */}
  <div class="relative">
    <textarea
      id="privateKeyText"
      name="privateKey"
      autocomplete="off"
      autocapitalize="off"
      spellcheck={false}
      placeholder="Paste your private key here"
      rows={3}
      class="block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      classList={{
        'border-slate-300': !formData().privateKey,
        'border-red-500 bg-red-50': formData().privateKey && !privateKeyValidation.isValid(),
        'border-green-500 bg-green-50': formData().privateKey && privateKeyValidation.isValid()
      }}
      value={formData().privateKey || ''}
      onInput={(e) => handlePrivateKeyInput(e.currentTarget.value)}
    />

    {/* Validation status indicator */}
    {formData().privateKey && (
      <div class="absolute right-2 top-2">
        {privateKeyValidation.isValid() ? (
          <span class="text-green-500" title={`Valid ${privateKeyValidation.format()} key`}>✓</span>
        ) : (
          <span class="text-red-500" title={privateKeyValidation.error()}>✗</span>
        )}
      </div>
    )}
  </div>

  {/* Validation error message */}
  {formData().privateKey && !privateKeyValidation.isValid() && (
    <div class="mt-2 text-sm">
      <p class="text-red-600">{privateKeyValidation.error()}</p>
      {privateKeyValidation.suggestion() && (
        <p class="text-gray-600 mt-1">{privateKeyValidation.suggestion()}</p>
      )}
    </div>
  )}

  {/* Key format badge */}
  {formData().privateKey && privateKeyValidation.isValid() && (
    <div class="mt-2">
      <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        {privateKeyValidation.format()} format detected
      </span>
    </div>
  )}

  {/* Submit button with validation */}
  <button
    type="submit"
    disabled={!isFormValid()}
    class="inline-flex w-full items-center justify-center rounded-md border border-transparent px-3 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Connect
  </button>
```

### 4. Add Validation to Credential Submission

Update `client/src/js/utils.ts` in `getCredentials()`:

```typescript
export function getCredentials(
  formData: Record<string, unknown> | null = null,
  terminalDimensions: { cols?: number; rows?: number } = {}
): ClientAuthenticatePayload {
  // ... existing code ...

  const privateKey = /* ... existing code ... */

  if (privateKey) {
    // Validate before including in credentials
    if (!validatePrivateKey(privateKey)) {
      console.warn('Invalid private key format detected, excluding from credentials')
      // Optionally: don't include the key, or throw an error
    } else {
      const deepValidation = validatePrivateKeyDeep(privateKey)
      if (!deepValidation) {
        console.warn('Private key failed deep validation, may not work')
      } else {
        debug(`Private key validated as ${deepValidation.format} format`)
      }
      mergedConfig.privateKey = privateKey
    }
    // ... passphrase handling ...
  }

  // ... rest of function ...
}
```

## Benefits of SolidJS Approach

1. **Reactive Validation**: Automatically updates as user types/pastes
2. **Better UX**: Real-time visual feedback with color-coded borders
3. **Helpful Error Messages**: Specific errors with suggestions for fixes
4. **Format Detection**: Shows detected key format when valid
5. **Composable**: Reusable validation hook and rules
6. **Type-Safe**: Full TypeScript support
7. **Accessible**: Screen reader friendly with proper ARIA attributes
8. **Consistent**: Uses existing validation framework patterns

## Implementation Steps

1. Create the `usePrivateKeyValidation` hook
2. Add private key rules to `ValidationRules`
3. Update `LoginModal` to use reactive validation
4. Add validation logging to `getCredentials()`
5. Test with various key formats and error cases
6. Add unit tests for validation functions

## Testing Scenarios

- Valid OpenSSH private key
- Valid PKCS#8 private key
- Valid PKCS#1 RSA private key
- Valid EC/DSA private keys
- Public key (should show specific error)
- Corrupted base64 content
- Missing headers/footers
- Empty key field
- Encrypted keys with passphrase
