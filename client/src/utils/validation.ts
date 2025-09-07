// Form validation utilities for SolidJS components
import type { Accessor } from 'solid-js'
import { createSignal } from 'solid-js'
import { validatePrivateKey, validatePrivateKeyDeep } from './index.js'

// Validation rule types
export interface ValidationRule<T = unknown> {
  message: string
  validate: (value: T) => boolean
}

// Field validation state
export interface FieldValidation {
  isValid: boolean
  error?: string
}

// Create a field validator
export function createFieldValidator<T>(
  value: Accessor<T>,
  rules: ValidationRule<T>[] = []
) {
  const [validation, setValidation] = createSignal<FieldValidation>({
    isValid: true
  })

  const validate = (): boolean => {
    const currentValue = value()

    for (const rule of rules) {
      if (!rule.validate(currentValue)) {
        setValidation({
          isValid: false,
          error: rule.message
        })
        return false
      }
    }

    setValidation({ isValid: true })
    return true
  }

  return {
    validation,
    validate,
    reset: () => setValidation({ isValid: true })
  }
}

// Common validation rules
export const ValidationRules = {
  required: <T>(message = 'This field is required'): ValidationRule<T> => ({
    message,
    validate: (value) => {
      if (typeof value === 'string') {
        return value.trim().length > 0
      }
      return value != null && value !== ''
    }
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    message: message || `Must be at least ${min} characters`,
    validate: (value) => value.length >= min
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    message: message || `Must be no more than ${max} characters`,
    validate: (value) => value.length <= max
  }),

  pattern: (
    regex: RegExp,
    message = 'Invalid format'
  ): ValidationRule<string> => ({
    message,
    validate: (value) => regex.test(value)
  }),

  email: (message = 'Invalid email address'): ValidationRule<string> => ({
    message,
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }),

  port: (
    message = 'Port must be between 1 and 65535'
  ): ValidationRule<number> => ({
    message,
    validate: (value) => {
      const num = Number(value)
      return num >= 1 && num <= 65535
    }
  }),

  hostname: (
    message = 'Invalid hostname or IP address'
  ): ValidationRule<string> => ({
    message,
    validate: (value) => {
      // Basic hostname/IP validation
      if (!value.trim()) return false

      // Check for valid hostname format
      const hostnameRegex =
        /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]))*$/

      // Check for valid IPv4 format
      const ipv4Regex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

      // Check for valid IPv6 format (basic check)
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/

      return (
        hostnameRegex.test(value) ||
        ipv4Regex.test(value) ||
        ipv6Regex.test(value)
      )
    }
  }),

  custom: <T>(
    validate: (value: T) => boolean,
    message = 'Invalid value'
  ): ValidationRule<T> => ({
    message,
    validate
  }),

  privateKey: (
    message = 'Invalid private key format'
  ): ValidationRule<string> => ({
    message,
    validate: (value) => {
      if (!value || value.trim() === '') return true // Empty is allowed
      return validatePrivateKey(value)
    }
  }),

  privateKeyDeep: (
    message = 'Private key appears malformed or unsupported'
  ): ValidationRule<string> => ({
    message,
    validate: (value) => {
      if (!value || value.trim() === '') return true // Empty is allowed
      return validatePrivateKey(value) && validatePrivateKeyDeep(value) !== null
    }
  }),

  privateKeyWithDetails: (): ValidationRule<string> => ({
    message: 'Invalid private key',
    validate: (value) => {
      if (!value || value.trim() === '') return true // Empty is allowed

      // Check for public key mistake
      if (
        value.includes('ssh-rsa') ||
        value.includes('ssh-ed25519') ||
        value.includes('ecdsa-sha2')
      ) {
        return false
      }

      return validatePrivateKey(value) && validatePrivateKeyDeep(value) !== null
    }
  })
}

// Form validator for multiple fields
export function createFormValidator(
  fields: Record<string, { validate: () => boolean }>
) {
  const [isFormValid, setIsFormValid] = createSignal(true)

  const validateForm = (): boolean => {
    let valid = true

    Object.values(fields).forEach((field) => {
      if (!field.validate()) {
        valid = false
      }
    })

    setIsFormValid(valid)
    return valid
  }

  const resetForm = () => {
    Object.values(fields).forEach((field) => {
      if ('reset' in field) {
        ;(field as { reset: () => void }).reset()
      }
    })
    setIsFormValid(true)
  }

  return {
    isFormValid,
    validateForm,
    resetForm
  }
}

// Async validator for server-side validation
export function createAsyncValidator<T>(
  value: Accessor<T>,
  asyncValidate: (value: T) => Promise<{ isValid: boolean; error?: string }>,
  debounceMs = 500
) {
  const [validation, setValidation] = createSignal<FieldValidation>({
    isValid: true
  })
  const [isValidating, setIsValidating] = createSignal(false)

  let timeoutId: number | undefined

  const validate = (): Promise<boolean> => {
    return new Promise((resolve) => {
      setIsValidating(true)

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(async () => {
        try {
          const currentValue = value()
          const result = await asyncValidate(currentValue)

          setValidation(result)
          setIsValidating(false)
          resolve(result.isValid)
        } catch {
          setValidation({
            isValid: false,
            error: 'Validation error occurred'
          })
          setIsValidating(false)
          resolve(false)
        }
      }, debounceMs)
    })
  }

  return {
    validation,
    isValidating,
    validate,
    reset: () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      setValidation({ isValid: true })
      setIsValidating(false)
    }
  }
}
