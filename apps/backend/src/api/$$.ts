import { appFactory } from '#src/helpers/factory.js'

export const apiRoute = appFactory.createApp()
  .get('', async c => c.text('OK'))
