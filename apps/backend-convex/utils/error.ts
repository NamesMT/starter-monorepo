import { destr } from 'destr'

export function normalizePossibleSDKError(error: any) {
  if (error.name === 'AI_APICallError') {
    return {
      name: 'AI_APICallError',
      message: destr<any>(error.responseBody)?.error?.message ?? error.message,
      cause: error.cause,
    }
  }

  return error
}

import { ConvexError } from 'convex/values'

export function getErrorMessage(error: Error | null) {
  if (error instanceof ConvexError)
    return error.data.msg ?? error.data.message ?? error.data.kind ?? error.data ?? error.name

  return error?.message ?? error
}
