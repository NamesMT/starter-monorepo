import { customArktypeValidator } from '#src/helpers/arktype.js'
import { appFactory } from '#src/helpers/factory.js'
import { i18nComposer } from '#src/helpers/i18n.js'
import { type } from 'arktype'
import { describeRoute, resolver } from 'hono-openapi'

export const dummyGreetRoute = appFactory.createApp()
  .get(
    '',
    describeRoute({
      description: 'Say hello to a user',
      responses: {
        200: {
          description: 'Successful response',
          content: {
            'text/plain': { schema: resolver(type('string')) },
          },
        },
      },
    }),
    customArktypeValidator('query', type({
      'name': 'string>0',
      'locale?': `'en' | 'vi'`,
    })),
    async (c) => {
      const { name, locale } = c.req.valid('query')
      return c.text(`${i18nComposer.t('hello', 1, { locale })} ${name}!`)
    },
  )
