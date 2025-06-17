import type { HonoWithConvex } from 'convex-helpers/server/hono'
import type { ActionCtx } from './_generated/server'
import { HttpRouterWithHono } from 'convex-helpers/server/hono'
import { Hono } from 'hono'
import { chatApp } from './http/chat'

const app: HonoWithConvex<ActionCtx> = new Hono()
app.route('/api/chat', chatApp)

export default new HttpRouterWithHono(app)
