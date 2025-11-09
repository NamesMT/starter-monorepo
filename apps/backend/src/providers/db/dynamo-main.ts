import { cacheProvider, getCachedProvider, isNonSharingPlatforms } from '#src/providers/index.js'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { env } from 'std-env'

export const PROVIDER_NAME = 'dynamo-main'

export function getCachedDynamo(): Awaited<ReturnType<typeof initDynamo>> | undefined {
  return getCachedProvider(`${PROVIDER_NAME}--dynamo`)
}

export async function getDynamo() {
  const cached = getCachedDynamo()

  if (!cached && !isNonSharingPlatforms)
    throw new Error('Not initialized')

  return cached ?? await initDynamo()
}

export async function initDynamo() {
  const cached = getCachedDynamo()

  if (!isNonSharingPlatforms && cached)
    console.warn('Already initialized')

  const requiredEnvs = {
    region: env.DYNAMO_MAIN_REGION!,
    accessKeyId: env.DYNAMO_MAIN_ACCESS_KEY_ID!,
    secretAccessKey: env.DYNAMO_MAIN_SECRET_ACCESS_KEY!,
  }

  const missingEnvs = Object.entries(requiredEnvs).flatMap(([key, value]) => value ? [] : key)
  if (missingEnvs.length)
    throw new Error(`Missing required env: ${missingEnvs.join(', ')}`)

  const dynamo = await setupDynamo({
    ...requiredEnvs,
  })

  cacheProvider(`${PROVIDER_NAME}--dynamo`, dynamo)

  return dynamo
}

export type SetupDynamoConfig = {
  region: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}
export async function setupDynamo(config: SetupDynamoConfig) {
  const { region, accessKeyId, secretAccessKey, sessionToken } = config

  const dbClient = new DynamoDBClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      sessionToken,
    },
  })
  const dbDocumentClient = DynamoDBDocumentClient.from(dbClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  })

  return {
    dbClient,
    dbDocumentClient,
  }
}
