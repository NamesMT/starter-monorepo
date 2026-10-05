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
- **Flat `content: string`.** Simple to query and render, but it cannot express reasoning parts, and ordering across text/tool/step boundaries is lost (tool calls live in a sibling `toolInvocations` array). The AI SDK recommends storing `UIMessage` `parts` instead.
- **History window, not summarization.** `windowChatHistory` keeps the last 40 messages. Deterministic and cheap; summarization would need an extra model call that can fail mid-conversation.

## Known gaps

- **Reasoning/thinking** is not represented or rendered.
- **Regenerate / edit a turn** is not implemented.
- **Prompt caching** is not configured; each turn re-sends the window uncached.
- **Stopping is cooperative**, so it lands within `CANCEL_POLL_MS` rather than instantly, and tokens burned inside that window are still spent.

Adopting `@ai-sdk/vue`'s `useChat` is the natural way to close most of these — it brings `regenerate`, tool approvals and reasoning rendering. It requires migrating storage to `parts` first, which is the real work; the streaming loop itself is not the blocker. `@ai-sdk/vue` pins the matching `ai` version exactly, so it needs no AI SDK bump.
