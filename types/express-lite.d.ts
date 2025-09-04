declare module 'express' {
  export interface Request {}
  export interface Response {
    setHeader(name: string, value: string): void
    sendFile(path: string): void
  }
  export type NextFunction = () => void
  export interface ExpressApp {
    use: (...args: unknown[]) => unknown
    get: (path: string, handler: (req: Request, res: Response) => unknown) => unknown
    listen: (port: number, cb: () => void) => unknown
  }
  export interface ExpressModule {
    (): ExpressApp
    static: (...args: unknown[]) => unknown
  }
  const express: ExpressModule
  export default express
}

