import { cacheProvider, getCachedProvider, isNonSharingPlatforms } from '#src/providers/index.js'
import { S3Client } from '@aws-sdk/client-s3'
import { env } from 'std-env'

export const PROVIDER_NAME = 'r2-main'

export function getCachedR2(): Awaited<ReturnType<typeof initR2>> | undefined {
  return getCachedProvider(`${PROVIDER_NAME}--r2`)
}

export async function getR2() {
  const cached = getCachedR2()

  if (!cached && !isNonSharingPlatforms)
    throw new Error('Not initialized')

  return cached ?? await initR2()
}

export async function initR2() {
  const cached = getCachedR2()

  if (!isNonSharingPlatforms && cached)
    console.warn('Already initialized')

  const requiredEnvs = {
    accountId: env.R2_MAIN_ACCOUNT_ID!,
    accessKeyId: env.R2_MAIN_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_MAIN_SECRET_ACCESS_KEY!,
  }

  const missingEnvs = Object.entries(requiredEnvs).flatMap(([key, value]) => value ? [] : key)
  if (missingEnvs.length)
    throw new Error(`Missing required env: ${missingEnvs.join(', ')}`)

  const r2 = await setupR2({
    ...requiredEnvs,
  })

  cacheProvider(`${PROVIDER_NAME}--r2`, r2)

  return r2
}

export type SetupR2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
}
export async function setupR2(config: SetupR2Config) {
  const { accountId, accessKeyId, secretAccessKey } = config

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return { s3Client }
}
