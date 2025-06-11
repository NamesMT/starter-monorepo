import type { HonoWithConvex } from 'convex-helpers/server/hono'
import type { ActionCtx } from './_generated/server'
import { HttpRouterWithHono } from 'convex-helpers/server/hono'
import { Hono } from 'hono'
import { aiApp } from './http/ai'

const app: HonoWithConvex<ActionCtx> = new Hono()
app.route('/api/ai', aiApp)

export default new HttpRouterWithHono(app)
