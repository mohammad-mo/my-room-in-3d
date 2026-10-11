export type VisitMeta = {
  userAgent: string
  city: string
  region: string
  country: string
  ip: string
}

const SITE = 'https://mohammads-portfolio.vercel.app'
const MAIL_TO = 'mohammadmahone@gmail.com'

type MailResponse = {
  statusCode?: number
  on: (event: 'data' | 'end' | 'error', listener: (chunk?: Uint8Array) => void) => void
}

type MailRequest = {
  on: (event: 'error', listener: (error: Error) => void) => void
  setTimeout: (ms: number, callback: () => void) => void
  destroy: () => void
  write: (body: string) => void
  end: () => void
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

async function postMail(body: string): Promise<{ status: number; text: string }> {
  const https = (await import('node:https')) as {
    request: (
      options: {
        hostname: string
        path: string
        method: string
        headers: Record<string, string>
      },
      callback: (response: MailResponse) => void,
    ) => MailRequest
  }
  const payload = body

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'formsubmit.co',
        path: `/ajax/${MAIL_TO}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: SITE,
          Referer: `${SITE}/`,
          'User-Agent': 'Mozilla/5.0',
          'Content-Length': String(new TextEncoder().encode(payload).byteLength),
        },
      },
      (response) => {
        const chunks: Uint8Array[] = []
        response.on('data', (chunk) => {
          if (chunk) chunks.push(chunk)
        })
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            text: new TextDecoder().decode(concatBytes(chunks)),
          })
        })
        response.on('error', () => reject(new Error('The mail service did not respond.')))
      },
    )
    req.setTimeout(12000, () => {
      req.destroy()
      reject(new Error('The mail service took too long.'))
    })
    req.on('error', () => reject(new Error('The mail service could not be reached.')))
    req.write(payload)
    req.end()
  })
}

export function header(
  headers: Record<string, string | string[] | undefined>,
  name: string,
) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()]
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function metaFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): VisitMeta {
  const forwarded = header(headers, 'x-forwarded-for').split(',')[0]?.trim() ?? ''
  return {
    userAgent: header(headers, 'user-agent'),
    city: header(headers, 'x-vercel-ip-city'),
    region: header(headers, 'x-vercel-ip-country-region'),
    country: header(headers, 'x-vercel-ip-country'),
    ip: forwarded || header(headers, 'x-real-ip'),
  }
}

export function describeDevice(userAgent: string): string {
  if (!userAgent) return 'Unknown device'

  let device = 'Computer'
  if (/iPhone/.test(userAgent)) device = 'iPhone'
  else if (/iPad/.test(userAgent)) device = 'iPad'
  else if (/Android/.test(userAgent)) {
    const model = userAgent.match(/Android [^;]*;\s*([^;)]+)/)
    device = model?.[1]?.replace(/\s*Build\/.*/, '').trim() || 'Android'
  } else if (/Macintosh/.test(userAgent)) device = 'Mac'
  else if (/Windows/.test(userAgent)) device = 'Windows PC'
  else if (/Linux/.test(userAgent)) device = 'Linux'

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'browser'

  return `${device}, ${browser}`
}

export function locationLabel(meta: VisitMeta): string {
  const place = [meta.city, meta.region, meta.country].filter(Boolean).join(', ')
  return place || 'Unknown'
}

export function visitLines(
  meta: VisitMeta,
  page: string,
  referrer: string,
  language: string,
) {
  return [
    `When: ${new Date().toISOString()}`,
    `Device: ${describeDevice(meta.userAgent)}`,
    `Browser details: ${meta.userAgent || 'unknown'}`,
    `Location: ${locationLabel(meta)}`,
    `IP: ${meta.ip || 'unknown'}`,
    `Language: ${language || 'unknown'}`,
    `Page: ${page || 'unknown'}`,
    `Referrer: ${referrer || 'not sent'}`,
  ]
}

export async function sendRoomEmail(
  subject: string,
  message: string,
): Promise<{ ok: true } | { error: string }> {
  let status = 0
  let result: { success?: boolean | string; message?: string } = {}
  try {
    const response = await postMail(
      JSON.stringify({
        _subject: subject,
        _template: 'box',
        _captcha: 'false',
        message,
      }),
    )
    status = response.status
    result = JSON.parse(response.text) as { success?: boolean | string; message?: string }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'The email could not be sent. Try again.'
    console.error('Room email failed', detail)
    return { error: detail }
  }

  if (status < 200 || status >= 300 || result.success === false || result.success === 'false') {
    console.error('Room email failed', status, result.message)
    return { error: result.message || 'The email could not be sent. Try again.' }
  }

  return { ok: true }
}
