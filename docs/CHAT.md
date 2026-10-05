# Chat

The AI chat lives in `apps/backend-convex` (model calls, persistence) and `apps/frontend/app/components/chat`.

## Shape

- `POST /api/chat` (a Convex HTTP action, `convex/http/chat.ts`) validates the turn, persists the user message, then streams the model reply back as an AI SDK UI-message stream.
- New turns stream over HTTP. Other realtime updates (another user's message, a resumed stream) arrive by polling a Convex counter subscription, not SSE.
- Persistence is `threads` + `messages`; attachments are Convex file storage blobs referenced from the message.

## Deliberate choices

These are tradeoffs, not oversights — change them knowingly.

- **Polling, not SSE.** Keeps the deployment to Convex alone: no pub-sub or Redis, which matters for the self-host/family use this template targets. The HTTP endpoint rejects `resumeStreamId` on purpose (`convex/http/chat.ts`); SSE resume needs a pub-sub wired into `ChatInterface`.
- **Cooperative stop.** Convex actions have no abort signal, so stop sets `cancelRequested` on the message and the generating action polls it (`CANCEL_POLL_MS`) into a local abort. The `requestStop` mutation also finalizes the message itself, because aborting ends the HTTP response and the action's post-abort `onEnd` work is not guaranteed to survive that teardown — relying on it left `isStreaming` set and the client polling a reply that never ended.
- **Messages store ordered `parts`.** An assistant reply interleaves text, reasoning and tool calls, so it is stored as the AI SDK's part list (`text`, `reasoning`, `dynamic-tool`, `step-start`) rather than a flat string plus a sibling tool array. That is the shape the SDK's `convertToModelMessages` expects, which is now what builds the prompt.
- **No per-part `state`.** Whether a reply is still streaming is `message.isStreaming`. Keeping a second copy inside each part needed a final write to beat Convex tearing the action down as the response ended, and it lost that race.
- **History window, not summarization.** `windowChatHistory` keeps the last 40 messages. Deterministic and cheap; summarization would need an extra model call that can fail mid-conversation.
- **Regenerate rewrites in place.** It replays the thread without that reply and reuses the same message row, so a regenerated turn keeps its position and id instead of appending a second answer.

## Migrating an existing deployment

The parts schema is a **breaking change for stored data**: Convex validates every existing row
when the schema is pushed, so old rows would fail the deploy. The old fields are therefore still
accepted as optional and read through `resolveMessageParts`, and two migrations convert data in
place (batched, self-rescheduling):

```sh
pnpm -F=backend-convex exec convex run messages:migrateToParts   # content + toolInvocations -> parts
pnpm -F=backend-convex exec convex run messages:dropPartState   # strips the old per-part state
```

The legacy fields can be dropped from `convex/schema.ts` once both report `remaining: 0`.

## Known gaps

- **Editing a sent user message** is not implemented (regenerating an assistant reply is).
- **Prompt caching** is not configured; each turn re-sends the window uncached.
- **Stopping is cooperative**, so it lands within `CANCEL_POLL_MS` rather than instantly, and tokens burned inside that window are still spent.

Adopting `@ai-sdk/vue`'s `useChat` is the natural way to close most of these — it brings tool approvals and a maintained client stream loop. Storage is already in its `parts` shape, so the remaining work is the transport against the Convex HTTP action. `@ai-sdk/vue` pins the matching `ai` version exactly, so it needs no AI SDK bump.
