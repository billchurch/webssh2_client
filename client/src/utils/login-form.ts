// Helpers for the LoginModal form state
import type { ClientAuthenticatePayload } from '../types/events.d'

// Form fields that hold secrets; they must not outlive the login attempt
export const LOGIN_SECRET_FIELDS = [
  'password',
  'privateKey',
  'passphrase'
] as const

// Return the form data with every secret field emptied. Host, port and
// username are kept so a retry only needs the secret again.
export const clearSecretFields = (
  formData: Partial<ClientAuthenticatePayload>
): Partial<ClientAuthenticatePayload> => {
  const cleared = { ...formData }
  for (const field of LOGIN_SECRET_FIELDS) {
    cleared[field] = ''
  }
  return cleared
}
