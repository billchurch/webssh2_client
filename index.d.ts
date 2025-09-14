declare module 'webssh2_client' {
  interface WebSSH2Client {
    getPublicPath(): string
    version: string
  }

  const client: WebSSH2Client
  export default client
}
