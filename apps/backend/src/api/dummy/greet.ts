import { localeCodes } from '@local/locales/src/index'
import { type } from 'arktype'
import { describeRoute, resolver } from 'hono-openapi'
import { customArktypeValidator } from '#src/helpers/arktype.js'
import { appFactory } from '#src/helpers/factory.js'
import { translate } from '#src/helpers/i18n.js'

export const dummyGreetRoute = appFactory.createApp()
  .get(
    '',
    describeRoute({
      summary: 'Greet a named user in a locale',
      description: 'Returns the translated `hello` message and the supplied `name` as plain text, e.g. `Hello World!` (`Xin chào World!` for `locale=vi`). Public, no session needed, and the response is derived only from the query string: `name` is required and must be at least one character, `locale` is optional and must be one of the shared locale codes, defaulting to the default locale. Invalid input returns 400 with the shared error body — `locale=de` or a missing `name` both produce `{"message":"Validation failed","code":"DetailedError","detail":[...]}`. The route writes nothing.',
      responses: {
        200: {
          description: 'Successful response',
          content: {
            'text/plain': { schema: resolver(type('string')) },
          },
        },
        400: {
          description: 'Validation failed: `name` missing or empty, or `locale` not in the shared locale list',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Error' } },
          },
        },
      },
    }),
    customArktypeValidator('query', type({
      'name': 'string>0',
      // Derived from the shared locale list so adding a locale cannot leave this stale.
      'locale?': type.enumerated(...localeCodes),
    })),
    async (c) => {
      const { name, locale } = c.req.valid('query')
      return c.text(`${translate('hello', {}, { locale })} ${name}!`)
    },
  )
