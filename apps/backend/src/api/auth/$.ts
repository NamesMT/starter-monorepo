import { appFactory } from '#src/helpers/factory.js'
import { authRoutesApp } from './$.routes'

export const authApp = appFactory.createApp()
  .route('', authRoutesApp)
