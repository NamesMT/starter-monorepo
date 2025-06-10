import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'clear tasks table',
  { minutes: 10 }, // every 10 minutes
  internal.tasks.clearAll,
)

export default crons
