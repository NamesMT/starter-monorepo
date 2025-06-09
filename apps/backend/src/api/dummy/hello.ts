import { appFactory } from '#src/helpers/factory.js'
import { getHelloMessage } from './hello.helper'

export const dummyHelloRouteApp = appFactory.createApp()
  .get('', async c => c.text(getHelloMessage()))
