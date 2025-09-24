import { customArktypeValidator } from '#src/helpers/arktype.js'
import { appFactory } from '#src/helpers/factory.js'
import { getCachedGrammy, initGrammy } from '#src/providers/telegram/grammy-main.js'
import { type } from 'arktype'
import { env } from 'std-env'

export const dummyGrammyRoute = appFactory.createApp()
  /**
   * Webhook route
   */
  .post(
    '',
    async (c) => {
      // Initialize grammy on-demand
      const { routeHandler } = getCachedGrammy() ?? await initGrammy()

      return routeHandler(c)
    },
  )

  /**
   * Sample route to send a message
   */
  .put(
    '',
    customArktypeValidator('json', type({
      'message': 'object',
      'chatId': 'number | string',
      'apiKey?': 'string',
    })),
    async (c) => {
      const { message, apiKey, chatId } = c.req.valid('json')

      if (apiKey !== env.DUMMY_GRAMMY_API_KEY)
        return c.text('Unauthorized', 401)

      const { bot } = getCachedGrammy() ?? await initGrammy()

      await bot.api.sendMessage(
        chatId,
        `Message from dummyGrammy:
${jsonBlockQuote(JSON.stringify(message, null, 2))}
`,
        { parse_mode: 'MarkdownV2' },
      )

      return c.text('OK')
    },
  )

function jsonBlockQuote(str: string) {
  return `\`\`\`json\n${str}\n\`\`\``
}
