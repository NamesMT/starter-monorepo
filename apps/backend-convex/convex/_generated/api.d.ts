/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as authInfo from "../authInfo.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as http_chat from "../http/chat.js";
import type * as messages from "../messages.js";
import type * as tasks from "../tasks.js";
import type * as threads from "../threads.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  authInfo: typeof authInfo;
  crons: typeof crons;
  http: typeof http;
  "http/chat": typeof http_chat;
  messages: typeof messages;
  tasks: typeof tasks;
  threads: typeof threads;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  shardedCounter: import("@convex-dev/sharded-counter/_generated/component.js").ComponentApi<"shardedCounter">;
};
