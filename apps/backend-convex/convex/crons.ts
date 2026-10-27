import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'clear tasks table',
  { hours: 1 },
  internal.tasks.clearAll,
)

// Messages before threads, and a minute apart. Both crons at 00:00 could interleave with an
// insert landing between them, orphaning a message whose thread was already deleted —
// `listByThread` then throws "Thread not found" for it forever. Children go first, and the
// gap keeps the two wipes from racing at all.
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
