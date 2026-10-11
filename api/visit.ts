import { metaFromHeaders, type VisitMeta, visitLines } from './_mail.js'

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

export function recordVisit(
  raw: unknown,
  meta: VisitMeta,
): {
  status: number
  body: { ok: true; subject: string; message: string } | { error: string }
} {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  if (text(body.website, 200)) {
    return { status: 200, body: { ok: true, subject: '', message: '' } }
  }

  return {
    status: 200,
    body: {
      ok: true,
      subject: 'Someone opened the room',
      message: visitLines(
        meta,
        text(body.page, 500),
        text(body.referrer, 500),
        text(body.language, 40),
      ).join('\n'),
    },
  }
}

export default function handler(req: NodeRequest, res: NodeResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const result = recordVisit(req.body, metaFromHeaders(req.headers ?? {}))
    res.status(result.status).json(result.body)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'The email could not be sent. Try again.' })
  }
}
