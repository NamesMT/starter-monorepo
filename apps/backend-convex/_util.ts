import { parseEnvFile } from '@local/common/src/utils/env'
import { objectPick } from '@namesmt/utils'
import { resolve } from 'pathe'

export async function getConvexEnvs() {
  return objectPick(
    await parseEnvFile(resolve(import.meta.dirname, '.env.local')).catch(() => ({} as any)),
    ['CONVEX_DEPLOYMENT', 'CONVEX_URL'],
  )
}
