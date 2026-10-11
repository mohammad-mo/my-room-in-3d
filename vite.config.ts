import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

type DevRequest = {
  url?: string
  method?: string
  headers: Record<string, string | string[] | undefined>
  on: (event: 'data' | 'end' | 'error', listener: (chunk?: Uint8Array) => void) => void
}

type DevResponse = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const body = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

function readBody(req: DevRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    req.on('data', (chunk) => {
      if (chunk) chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = new TextDecoder().decode(concatBytes(chunks))
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', () => reject(new Error('Could not read the request')))
  })
}

function applyMailEnv(fileEnv: Record<string, string>) {
  const runtime = globalThis as {
    process?: { env: Record<string, string | undefined> }
  }
  const env = runtime.process?.env
  if (!env) return
  for (const key of ['SITE', 'MAIL_TO']) {
    if (fileEnv[key]) env[key] = fileEnv[key]
  }
}

function suggestionDevApi(fileEnv: Record<string, string>): Plugin {
  return {
    name: 'suggestion-dev-api',
    configureServer(server) {
      applyMailEnv(fileEnv)
      server.middlewares.use(async (req, res, next) => {
        const request = req as DevRequest
        const response = res as DevResponse
        const url = request.url?.split('?')[0]
        if (url !== '/api/suggestion' && url !== '/api/visit') {
          next()
          return
        }
        if (request.method !== 'POST') {
          response.statusCode = 405
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const body = await readBody(request)
          const header = (name: string) => {
            const value = request.headers[name]
            return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
          }
          const forwarded = header('x-forwarded-for').split(',')[0]?.trim() ?? ''
          const meta = {
            userAgent: header('user-agent'),
            city: header('x-vercel-ip-city'),
            region: header('x-vercel-ip-country-region'),
            country: header('x-vercel-ip-country'),
            ip: forwarded || header('x-real-ip'),
          }
          const result =
            url === '/api/visit'
              ? await (await server.ssrLoadModule('/api/visit.ts')).recordVisit(
                  body,
                  meta,
                )
              : await (await server.ssrLoadModule('/api/suggestion.ts')).submitSuggestion(
                  body,
                  meta,
                )
          response.statusCode = result.status
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify(result.body))
        } catch {
          response.statusCode = 400
          response.setHeader('Content-Type', 'application/json')
          response.end(
            JSON.stringify({ error: 'The note could not be sent. Try again.' }),
          )
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, '.', '')
  return {
    plugins: [react(), tailwindcss(), suggestionDevApi(fileEnv)],
  }
})
