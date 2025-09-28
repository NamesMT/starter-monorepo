import type { UserFromGetMe } from 'grammy/types'
import { Bot, webhookCallback } from 'grammy'
import { env } from 'std-env'
import { cacheProvider, getCachedProvider, isNonSharingPlatforms } from '..'

export function getCachedGrammy(): Awaited<ReturnType<typeof initGrammy>> | undefined {
  return getCachedProvider('grammy-main--grammy')
}

export async function getGrammy() {
  const cached = getCachedGrammy()

  if (!cached && !isNonSharingPlatforms)
    throw new Error('Not initialized')

  return cached ?? await initGrammy()
}

export async function initGrammy() {
  const cached = getCachedGrammy()

  if (!isNonSharingPlatforms && cached)
    console.warn('Already initialized')

  const requiredEnvs = {
    botToken: env.GRAMMY_MAIN_TOKEN!,
  }

  const missingEnvs = Object.entries(requiredEnvs).flatMap(([key, value]) => value ? [] : key)
  if (missingEnvs.length)
    throw new Error(`Missing required env: ${missingEnvs.join(', ')}`)

  const grammy = await setupGrammy({
    ...requiredEnvs,
    webHookSecretToken: env.GRAMMY_MAIN_WEBHOOK_SECRET_TOKEN!,
    ...(env.GRAMMY_MAIN_BOT_INFO ? { botInfo: JSON.parse(env.GRAMMY_MAIN_BOT_INFO) } : {}),
  })

  cacheProvider('grammy-main--grammy', grammy)

  return grammy
}

export type GrammyBotConfig = {
  botToken: string
  webHookSecretToken?: string
  botInfo?: UserFromGetMe
}
export async function setupGrammy(config: GrammyBotConfig) {
  const bot = new Bot(config.botToken, {
    botInfo: config.botInfo,
  })

  await registerHandlersForGrammyBot(bot)

  return {
    bot,
    routeHandler: webhookCallback(
      bot,
      'hono',
      { secretToken: config.webHookSecretToken },
    ),
  }
}

export async function registerHandlersForGrammyBot(bot: Bot) {
  bot.command('start', ctx => ctx.reply('Welcome! Up and running.'))
}
