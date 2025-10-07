import { appFactory } from '#src/helpers/factory.js'
import { checkAuth } from './$.middleware'

// This route should be accessible only when user is authenticated
export const authCheckRoute = appFactory.createApp()
  .get(
    '',
    checkAuth(),
    async (c) => {
      return c.text('OK')
    },
  )
