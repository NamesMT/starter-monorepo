import { i18nComposer } from '#src/helpers/i18n.js'

// This is a sample for structuring guide
export const getHelloMessage = (from: string) => `${i18nComposer.t('hello-from-{x}', { x: from })}! - ${Date.now()}`
