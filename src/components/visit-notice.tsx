import { useEffect } from 'react'
import { sendRoomEmail } from '../mail'

let noticeStarted = false

export function VisitNotice() {
  useEffect(() => {
    if (noticeStarted) return
    noticeStarted = true

    const notify = async () => {
      try {
        if (window.sessionStorage.getItem('room-visit') === 'sent') return
        const response = await fetch('/api/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: window.location.href,
            referrer: document.referrer,
            language: navigator.language,
          }),
        })
        const body = (await response.json().catch(() => null)) as {
          ok?: true
          subject?: string
          message?: string
        } | null
        if (!response.ok || !body?.subject || !body.message) {
          noticeStarted = false
          return
        }
        const sent = await sendRoomEmail({ subject: body.subject, message: body.message })
        if ('error' in sent) {
          noticeStarted = false
          return
        }
        window.sessionStorage.setItem('room-visit', 'sent')
      } catch {
        noticeStarted = false
      }
    }

    void notify()
  }, [])

  return null
}
