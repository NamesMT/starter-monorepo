import { appFactory } from '#src/helpers/factory.js'
import { authRoutesApp } from './$.routes'
import { authCheckRoute } from './authCheck'

export const authApp = appFactory.createApp()
  .route('', authRoutesApp)
  .route('/check', authCheckRoute)
