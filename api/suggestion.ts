import {
  describeDevice,
  locationLabel,
  metaFromHeaders,
  sendRoomEmail,
  type VisitMeta,
} from './mail'

type NodeRequest = {
  method?: string
  body?: unknown
  headers: Record<string, string | string[] | undefined>
}

type NodeResponse = {
  status: (code: number) => NodeResponse
  json: (body: unknown) => void
}

const MAX_SUGGESTION = 2000

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function instagramHandle(value: string): string {
  const fromUrl = value.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)/i,
  )
  const handle = fromUrl?.[1] ?? value.replace(/^@/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : ''
}

function githubHandle(value: string): string {
  const fromUrl = value.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]+)/i)
  const handle = fromUrl?.[1] ?? value.replace(/^@/, '')
  return /^[A-Za-z0-9-]{1,39}$/.test(handle) ? handle : ''
}

export async function submitSuggestion(
  raw: unknown,
  meta: VisitMeta,
): Promise<{ status: number; body: { ok: true } | { error: string } }> {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  if (text(body.website, 200)) return { status: 200, body: { ok: true } }

  const suggestion = text(body.suggestion, MAX_SUGGESTION)
  if (!suggestion) return { status: 400, body: { error: 'Write a suggestion first.' } }

  const instagramInput = text(body.instagram, 120)
  const githubInput = text(body.github, 120)
  const instagram = instagramInput ? instagramHandle(instagramInput) : ''
  const github = githubInput ? githubHandle(githubInput) : ''
  if (instagramInput && !instagram) {
    return { status: 400, body: { error: 'That Instagram handle does not look right.' } }
  }
  if (githubInput && !github) {
    return { status: 400, body: { error: 'That GitHub username does not look right.' } }
  }

  const subject = instagram
    ? `Room note from @${instagram}`
    : github
      ? `Room note from ${github} on GitHub`
      : 'Room note'
  const message = [
    suggestion,
    '',
    `Instagram: ${instagram ? `@${instagram}` : 'not shared'}`,
    `GitHub: ${github || 'not shared'}`,
    '',
    `Device: ${describeDevice(meta.userAgent)}`,
    `Browser details: ${meta.userAgent || 'unknown'}`,
    `Location: ${locationLabel(meta)}`,
    `IP: ${meta.ip || 'unknown'}`,
    `Language: ${text(body.language, 40) || 'unknown'}`,
    `Page: ${text(body.page, 500) || 'unknown'}`,
    `Referrer: ${text(body.referrer, 500) || 'not sent'}`,
  ].join('\n')

  const sent = await sendRoomEmail(subject, message)
  if ('error' in sent) return { status: 502, body: sent }
  return { status: 200, body: { ok: true } }
}

export default async function handler(req: NodeRequest, res: NodeResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const result = await submitSuggestion(req.body, metaFromHeaders(req.headers))
  res.status(result.status).json(result.body)
}
