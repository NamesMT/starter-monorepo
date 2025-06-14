import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'clear tasks table',
  { hours: 1 },
  internal.tasks.clearAll,
)

crons.daily(
  'clear threads table',
  { hourUTC: 0, minuteUTC: 0 },
  internal.threads.clearAll,
)

crons.daily(
  'clear messages table',
  { hourUTC: 0, minuteUTC: 0 },
  internal.messages.clearAll,
)

crons.interval(
  'resolve stuck stream messages',
  { hours: 1 },
  internal.messages.resolveStuckStreamMessages,
)

export default crons
