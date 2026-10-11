declare module 'node:https' {
  export function request(
    options: {
      hostname: string
      path: string
      method: string
      headers: Record<string, string>
    },
    callback: (response: {
      statusCode?: number
      on: (event: 'data' | 'end' | 'error', listener: (chunk?: Uint8Array) => void) => void
    }) => void,
  ): {
    on: (event: 'error', listener: (error: Error) => void) => void
    setTimeout: (ms: number, callback: () => void) => void
    destroy: () => void
    write: (body: string) => void
    end: () => void
  }
}
