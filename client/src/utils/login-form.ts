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

// Tracks which open of the login modal an async secret read belongs to.
// Closing the modal invalidates every read still in flight, so a late
// read cannot put a secret back into cleared form state.
export interface SecretReadGuard {
  current: () => number
  isCurrent: (token: number) => boolean
  invalidate: () => void
}

export const createSecretReadGuard = (): SecretReadGuard => {
  let generation = 0
  return {
    current: () => generation,
    isCurrent: (token) => token === generation,
    invalidate: () => {
      generation += 1
    }
  }
}

// Read a secret file and hand its text to apply() only if the guard was
// not invalidated while the read was pending. Returns whether it applied.
export const readSecretFile = async (
  file: Pick<Blob, 'text'>,
  guard: SecretReadGuard,
  apply: (content: string) => void
): Promise<boolean> => {
  const token = guard.current()
  const content = await file.text()
  if (!guard.isCurrent(token)) return false
  apply(content)
  return true
}
