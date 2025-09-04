declare module 'debug' {
  export type DebugFn = ((...args: unknown[]) => void) & { enabled?: boolean }
  export default function createDebug(namespace: string): DebugFn
}
