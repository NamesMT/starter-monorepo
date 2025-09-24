import { DetailedError } from '@namesmt/utils'
import { validator as arktypeValidator } from 'hono-openapi'

type arktypeValidatorArguments = Parameters<typeof arktypeValidator>
export function customArktypeValidator<Target extends arktypeValidatorArguments[0], Schema extends arktypeValidatorArguments[1]>(target: Target, schema: Schema) {
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
