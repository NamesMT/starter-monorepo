import type { Context } from 'hono'
import { ConvexError } from 'convex/values'
import { HTTPException } from 'hono/http-exception'

/**
 * Client-facing error body. Kept flat so the frontend can read `message` without knowing
 * which layer threw.
 */
interface ChatErrorBody {
  message: string
}

/**
 * Errors that mean "your request was wrong", not "the server broke".
 *
 * Convex turns an uncaught throw into a bare HTTP 500, which hides a rejected key or a
 * missing thread behind the same status as a real outage and never reaches the client's
 * 4xx handling. Anything we can attribute to the request is answered as one.
 */
function statusFor(error: Error): 400 | 401 | 403 | 404 | 500 {
  if (error instanceof HTTPException) {
    const { status } = error
    // Only the classes we answer deliberately; anything else is our own fault.
    if (status === 400 || status === 401 || status === 403 || status === 404)
      return status
    return 500
  }

  if (error instanceof ConvexError) {
    const data = error.data as { msg?: string, message?: string, status?: number } | string | undefined
    const explicit = typeof data === 'object' && data !== null ? data.status : undefined

    if (explicit === 401 || explicit === 403 || explicit === 404 || explicit === 400)
      return explicit

    const text = typeof data === 'string' ? data : data?.msg ?? data?.message ?? ''
    if (/not authenticated/i.test(text))
      return 401
    if (/not authorized|not allowed/i.test(text))
      return 403
    if (/not found/i.test(text))
      return 404
  }

  // A malformed `context`/`attachments` JSON body throws a SyntaxError in a transform, and
  // a BYOK provider without a key throws before any network call: both are caller errors.
  if (error instanceof SyntaxError)
    return 400
  if (/requires an apiKey|Invalid model for hosted provider|Unknown provider/i.test(error.message))
    return 400

  return 500
}

/** Maps a thrown error to a status and a safe body, logging only what the client never sees. */
export function chatErrorHandler(error: Error, c: Context) {
  const status = statusFor(error)

  if (status >= 500) {
    // Unexpected: keep the detail server-side. Provider errors are streamed to the client by
    // design (`withProviderErrorAsText`), so this path is our own bugs only.
    console.error('[chat] unhandled error:', error)
    const body: ChatErrorBody = { message: 'Internal Server Error' }
    return c.json(body, 500)
  }

  // A 4xx is a statement about the request, so its message is safe to return.
  const message = error instanceof HTTPException
    ? error.message
    : (error instanceof ConvexError
        ? (typeof error.data === 'string' ? error.data : (error.data as any)?.msg ?? (error.data as any)?.message ?? error.message)
        : error.message)

  return c.json<ChatErrorBody>({ message: String(message ?? 'Bad request') }, status)
}
