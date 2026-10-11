import { metaFromHeaders, sendRoomEmail, type VisitMeta, visitLines } from './mail'

type NodeRequest = {
  method?: string
  body?: unknown
  headers: Record<string, string | string[] | undefined>
}

type NodeResponse = {
  status: (code: number) => NodeResponse
  json: (body: unknown) => void
}

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export async function recordVisit(
  raw: unknown,
  meta: VisitMeta,
): Promise<{ status: number; body: { ok: true } | { error: string } }> {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  if (text(body.website, 200)) return { status: 200, body: { ok: true } }

  const sent = await sendRoomEmail(
    'Someone opened the room',
    visitLines(
      meta,
      text(body.page, 500),
      text(body.referrer, 500),
      text(body.language, 40),
    ).join('\n'),
  )
  if ('error' in sent) return { status: 502, body: sent }
  return { status: 200, body: { ok: true } }
}

export default async function handler(req: NodeRequest, res: NodeResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const result = await recordVisit(req.body, metaFromHeaders(req.headers))
  res.status(result.status).json(result.body)
}
