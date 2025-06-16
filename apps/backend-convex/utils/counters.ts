import { ShardedCounter } from '@convex-dev/sharded-counter'
import { components } from '../convex/_generated/api'

export const singleShardCounter = new ShardedCounter(components.shardedCounter, { defaultShards: 1 })
