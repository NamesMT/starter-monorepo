import { appFactory } from '#src/helpers/factory.js'
import { apiRouteApp } from './$$'
import { authApp } from './auth/$'
import { dummyConvexRouteApp } from './dummy/convex'
import { dummyGreetRouteApp } from './dummy/greet'
import { dummyHelloRouteApp } from './dummy/hello'

export const apiApp = appFactory.createApp()
  // Simple health check route
  .route('', apiRouteApp)

  // Auth app - you'll need to setup Kinde environment variables.
  .route('/auth', authApp)

  // Some example routes
  .route('/dummy/convex', dummyConvexRouteApp)
  .route('/dummy/hello', dummyHelloRouteApp)
  .route('/dummy/greet', dummyGreetRouteApp)

// ### This block contains the sample code for streaming APIs,
// import type { TypedResponse } from 'hono'
// import { streamText } from 'hono/streaming'

// Do note that SST doesn't support Live Development for Lambda streaming API yet: https://sst.dev/docs/component/aws/function/#streaming

// For RPC to know the type of streamed endpoints you could manually cast it with TypedResponse 👌
// .get('/helloStream', c => streamText(c, async (stream) => {
//   await stream.writeln('Hello from Hono `/api/helloStream`!')
// }) as Response & TypedResponse<'Hello from Hono `/api/helloStream`!'>)
// ###
