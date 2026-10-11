export const MAIL_TO = 'mohammadmahone@gmail.com'

export type RoomEmail = { subject: string; message: string }

export async function sendRoomEmail({
  subject,
  message,
}: RoomEmail): Promise<{ ok: true } | { error: string }> {
  let response: Response
  try {
    response = await fetch(`https://formsubmit.co/ajax/${MAIL_TO}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: subject,
        _template: 'box',
        _captcha: 'false',
        message,
      }),
    })
  } catch {
    return { error: 'The email could not be sent. Try again.' }
  }

  let result: { success?: boolean | string; message?: string } = {}
  try {
    result = (await response.json()) as { success?: boolean | string; message?: string }
  } catch {
    return { error: 'The email could not be sent. Try again.' }
  }

  if (!response.ok || result.success === false || result.success === 'false') {
    return { error: 'The email could not be sent. Try again.' }
  }

  return { ok: true }
}
