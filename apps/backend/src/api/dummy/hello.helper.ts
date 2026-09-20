import { translate } from '#src/helpers/i18n.js'

// This is a sample for structuring guide
export const getHelloMessage = (from: string) => `${translate('hello-from-{x}', { x: from })}! - ${Date.now()}`
