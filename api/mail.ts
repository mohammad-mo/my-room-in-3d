export type VisitMeta = {
  userAgent: string
  city: string
  region: string
  country: string
  ip: string
}

function envValue(name: string): string {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> }
  }
  return runtime.process?.env?.[name]?.trim() ?? ''
}

export function header(
  headers: Record<string, string | string[] | undefined>,
  name: string,
) {
  const value = headers[name] ?? headers[name.toLowerCase()]
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
  const site = envValue('SITE')
  const recipient = envValue('MAIL_TO')
  if (!site || !recipient) {
    console.error('Missing SITE or MAIL_TO. Add them to .env.')
    return { error: 'The email could not be sent. Try again.' }
  }

  let response: Response
  try {
    response = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: site,
        Referer: `${site}/`,
      },
      body: JSON.stringify({
        _subject: subject,
        _template: 'box',
        _captcha: 'false',
        message,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return { error: 'The email could not be sent. Try again.' }
  }

  let result: { success?: boolean | string; message?: string } = {}
  try {
    result = (await response.json()) as { success?: boolean | string; message?: string }
  } catch {
    result = {}
  }

  if (!response.ok || result.success === false || result.success === 'false') {
    console.error('Room email failed', result.message ?? response.status)
    return { error: 'The email could not be sent. Try again.' }
  }

  return { ok: true }
}
