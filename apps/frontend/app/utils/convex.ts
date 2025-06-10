import { ConvexError } from 'convex/values'

export function getConvexErrorMessage(error: Error | null) {
  if (error instanceof ConvexError)
    return error.data.msg ?? error.data.message ?? error.data.kind

  return error?.message ?? error
}
