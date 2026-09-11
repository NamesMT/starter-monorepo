import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ValidationTargets } from 'hono'
import { DetailedError } from '@namesmt/utils'
import { validator as arktypeValidator } from 'hono-openapi'

export function customArktypeValidator<Target extends keyof ValidationTargets, Schema extends StandardSchemaV1>(target: Target, schema: Schema) {
  return arktypeValidator(target, schema, (result) => {
    if (result.success === false) {
      throw new DetailedError('Validation failed', {
        statusCode: 400,
        // Normalizes ArkErrors
        detail: JSON.parse(JSON.stringify(result.error)),
      })
    }
  })
}
