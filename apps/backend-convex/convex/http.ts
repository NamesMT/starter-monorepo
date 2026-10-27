import type { HonoWithConvex } from 'convex-helpers/server/hono'
import type { ActionCtx } from './_generated/server'
import { HttpRouterWithHono } from 'convex-helpers/server/hono'
import { Hono } from 'hono'
import { chatApp } from './http/chat'
import { chatErrorHandler } from './http/errors'

const app: HonoWithConvex<ActionCtx> = new Hono()
// Without this, every throw becomes a bare 500 and the client cannot tell a bad request
// from an outage.
app.onError(chatErrorHandler)
app.route('/api/chat', chatApp)

export default new HttpRouterWithHono(app)
