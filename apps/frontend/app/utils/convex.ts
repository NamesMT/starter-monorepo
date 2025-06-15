import { ConvexError } from 'convex/values'

export function getConvexErrorMessage(error: Error | null) {
  if (error instanceof ConvexError)
    return error.data.msg ?? error.data.message ?? error.data.kind ?? error.data ?? error.name

  return error?.message ?? error
}
