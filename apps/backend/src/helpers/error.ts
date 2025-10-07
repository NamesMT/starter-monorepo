/* eslint-disable no-console */
import type { HonoEnv } from '#src/types.js'
import type { DetailedError } from '@namesmt/utils'
import type { ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
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

  // Handling of custom DetailedError (DetailedError can comes from multiple sources (hono's parseResponse, @namesmt/utils))
  // So we're using a `.name` check here.
  if (err.name === 'DetailedError') {
    const _e = err as DetailedError
    return _makeErrorRes({
      body: { message: _e.message, code: _e.code ?? _e.name, detail: _e.detail },
      status: _e.statusCode ?? 500,
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
