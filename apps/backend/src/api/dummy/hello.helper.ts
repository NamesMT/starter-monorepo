import { i18nComposer } from '#src/helpers/i18n.js'

// This isa sample for structuring guide
export const getHelloMessage = () => `${i18nComposer.t('hello-from-/x', { x: 'i18n and Hono' })}! - ${Date.now()}`
