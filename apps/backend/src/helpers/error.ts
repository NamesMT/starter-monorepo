/* eslint-disable no-console */
import type { HonoEnv } from '#src/types.js'
import type { ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { DetailedError } from '@namesmt/utils'
import { HTTPException } from 'hono/http-exception'

export const errorHandler: ErrorHandler<HonoEnv> = (err, c) => {
  const _e = err as any
  // If Error is not server exception, log to debug only
  if (
    (_e.statusCode && _e.statusCode < 500)
    || (_e.status && _e.status < 500)
  ) {
    console.debug(err)
  }
  else {
    console.error(err)
  }

  // Handling of default Hono's HTTPException
  if (err instanceof HTTPException) {
    return _makeErrorRes({
      body: { message: err.message, code: err.name },
      status: err.status,
    })
  }

  if (err instanceof DetailedError) {
    return _makeErrorRes({
      body: { message: err.message, code: err.code ?? err.name, detail: err.detail },
      status: err.statusCode ?? 500,
    })
  }

  return _makeErrorRes({ body: { message: err.message, code: err.name } })

  // ### Local functions
  type _makeErrorResInput = { body: Record<string, any>, status?: ContentfulStatusCode }
  function _makeErrorRes({
    body = {
      message: 'Unknown error',
      code: 'UNKNOWN_ERROR',
    },
    status = 500,
  }: _makeErrorResInput) {
    return c.json(
      body,
      status,
    )
  }
}
