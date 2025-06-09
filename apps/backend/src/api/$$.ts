import { appFactory } from '#src/helpers/factory.js'

export const apiRouteApp = appFactory.createApp()
  .get('', async c => c.text('OK'))
