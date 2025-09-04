export const CSP_CONFIG: Record<string, string[]>
export function generateCSPHeader(): string
export const SECURITY_HEADERS: Record<string, string>
export function securityHeadersMiddleware(
  req: unknown,
  res: { setHeader: (name: string, value: string) => void },
  next: () => void
): void

