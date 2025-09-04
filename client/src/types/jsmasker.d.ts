declare module 'jsmasker' {
  /** Returns a masked clone of the object for safe logging */
  export default function maskObject<T>(obj: T): T
}

