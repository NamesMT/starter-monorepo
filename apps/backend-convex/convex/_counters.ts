import { ShardedCounter } from '@convex-dev/sharded-counter'
import { components } from './_generated/api'

export const messagesInThreadCounter = new ShardedCounter(components.shardedCounter, { defaultShards: 1 })
