import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'clear tasks table',
  { hours: 1 },
  internal.tasks.clearAll,
)

// Children first, a few minutes apart: a wipe that runs concurrently can orphan a message whose
// thread is already gone, which then throws "Thread not found" forever.
crons.daily(
  'clear messages table',
  { hourUTC: 0, minuteUTC: 0 },
  internal.messages.clearAll,
)

crons.daily(
  'clear threads table',
  { hourUTC: 0, minuteUTC: 5 },
  internal.threads.clearAll,
)

crons.interval(
  'resolve stuck stream messages',
  { minutes: 10 },
  internal.messages.resolveStuckStreamMessages,
)

// Runs after the thread/message wipe above, while also reclaiming blobs orphaned by any
// thread deleted earlier in the day. Without it those files are never freed.
crons.daily(
  'clear orphaned attachments',
  { hourUTC: 0, minuteUTC: 30 },
  internal.messages.clearOrphanedAttachments,
  {},
)

// TODO: add cron to clean duplicate headers added to content by dumb models.

export default crons
