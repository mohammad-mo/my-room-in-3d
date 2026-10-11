import { useEffect } from 'react'

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
        if (response.ok) window.sessionStorage.setItem('room-visit', 'sent')
        else noticeStarted = false
      } catch {
        noticeStarted = false
      }
    }

    void notify()
  }, [])

  return null
}
