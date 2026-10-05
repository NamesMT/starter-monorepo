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
- **Edit rewrites in place and drops what followed.** Editing a user message deletes every later message, because those answered text that no longer exists. Keeping them would leave the thread contradicting itself. There is no undo.

## Prompt caching

Without markers every turn of a thread re-sends the whole history window at full input price,
even though each turn's prompt is a superset of the previous one. `utils/caching.ts` wires the
per-provider mechanism.

The strategies are keyed on the **user-selected provider**, not on the model object: the hosted
chain wraps its members in a fallback model, so `model.provider` there names the wrapper rather
than whichever member serves the request. Getting this wrong is why the module is tested at the
wire level — cache configuration fails *silently*. A marker on a prefix a provider does not
cache, in the wrong `providerOptions` namespace, or below the provider's minimum prefix length
produces a perfectly successful request that simply never caches anything.

| Provider | Mechanism | Why |
| --- | --- | --- |
| `anthropic` | Explicit markers: system message + last message | The only BYOK provider here that requires them |
| `openai` | `promptCacheKey` = thread id | Caches implicitly already; the key only steers routing |
| `google`, `groq` | None | Cache implicitly, no marker surface |
| `openrouter` | None | Its `cache_control` is documented for Anthropic models only; our traffic is a free auto-router |
| `hosted` | None | A metered free OpenRouter model plus two keyless OpenAI-compatible endpoints — none is Anthropic |

Anthropic allows **4 markers per request** and silently discards the excess, so two are placed:
the system message (identical every turn) and the last message. The second advances each turn,
which is what makes the cache incremental — the previous turn's marked prefix is a prefix of
this turn's request, so it is read back and only the new tail is written.

Two things that look right and are not, both verified against the requests providers build:

- A *call-level* `anthropic.cacheControl` is **not** these markers. It produces a top-level
  `cache_control`, which is Anthropic's separate automatic-caching mode.
- Unknown `providerOptions` namespaces are dropped rather than forwarded, so marking the keyless
  members would be inert — they are asserted byte-clean instead.

A marker is not a promise of an entry: Anthropic enforces a minimum prefix length, so on a short
thread the markers are accepted and cache nothing. That degrades to the previous uncached
behaviour rather than failing. Cache accounting is logged on the `finish` chunk
(`cacheRead=`/`cacheWrite=`), because it is the only evidence caching engaged — verified live
against the hosted path, which correctly reports `cacheRead=0` since its members cannot cache.

## The hosted free tier

`H/auto/free` is the default agent and is a **fallback chain**, not one model. `HOSTED_FREE_CHAIN`
in `@local/common` holds the ordered members; the server builds them into one `ai-fallback` model
and `getAgentModel` returns it when the selection is `auto/free`.

Order matters and is deliberate:

1. `openrouter/free` — metered, best quality, tried first while its budget lasts.
2. `pollinations/openai` — **keyless**, so it keeps answering once a metered key is spent.
3. `ovh/llama-3.3-70b` — **keyless**, a second independent provider.

`ai-fallback` moves to the next member on a retryable error (429, 5xx, auth) and returns to the
top after a cooldown. `retryAfterOutput` is off: a stream that already emitted text cannot be
retried without the user seeing two partial answers.

### Why keyless members rather than more OpenRouter models

OpenRouter's free allowance is **account-wide, not per-model** — 50 requests/day for the whole
account, shared by every `:free` model (verified against `/api/v1/key`:
`free_model_daily_requests: { used, limit: 50 }`). Adding more `:free` models there adds no
capacity. Additional capacity has to come from a different provider, which is why the chain
includes keyless endpoints that need no credential at all.

Both keyless endpoints answered live with streaming and tool-calling. OVH is rate-limited to
2 requests/minute per IP, which is why it sits last and why a retryable 429 is what the failover
is for.

`auto/free` advertises the **intersection** of the chain's capabilities: the keyless members take
no attachments, so `auto/free` claims none. Pick a specific model to send a file.

Entries declare an optional `apiKeyEnv`. A missing key skips that member rather than failing the
request, so a fresh clone with no provider keys still answers from the keyless members.

## Migrating an existing deployment

The parts schema was a **breaking change for stored data**: Convex validates every existing row
when the schema is pushed, so old rows would have failed the deploy. The migration therefore ran
in two phases — first the old fields stayed accepted as optional and were read through
`resolveMessageParts`, then two batched, self-rescheduling migrations converted the data in
place (`messages:migrateToParts`, then `messages:dropPartState`).

Both reported `remaining: 0` and the first-phase code has been removed: `parts` is now a
**required** field, `content`/`toolInvocations` and the legacy per-part `state` are gone from the
schema, and `resolveMessageParts` is a plain cast. The migration functions themselves were
deleted with them, so a deployment that has not been migrated must run them from an older commit
before upgrading past this point.

## Reclaiming orphaned attachments

Attachments live in Convex file storage; the message row only holds a `storageId`. Deleting a
thread or message removes the rows but not the blobs, and the daily demo cron wipes every thread
and message — so without a sweep every attachment ever uploaded stays orphaned and billed
forever. `messages:clearOrphanedAttachments` (daily, 00:30 UTC, after the wipes) collects every
referenced `storageId` and deletes stored files that are unreferenced **and** at least an hour
old. The age guard matters: an upload and its message row are two steps, so a freshly uploaded
blob that has not been attached yet looks exactly like an orphan.

## Known gaps

- **Stopping is cooperative**, so it lands within `CANCEL_POLL_MS` rather than instantly, and tokens burned inside that window are still spent.
- **Attachment bytes are sent once.** `toUiMessage` emits no file parts, so an attachment reaches
  the model on the turn it was sent and is absent from every later turn's prompt — a follow-up
  question about an image is answered from text alone. Fixing it means re-reading each referenced
  blob into the prompt (cost, and a stored file can disappear), which is a deliberate tradeoff
  rather than an oversight.
- **Editing drops later replies.** An edited user message deletes every message after it, because
  those answered the old text. There is no undo.

## On adopting `@ai-sdk/vue`

The chat loop is hand-rolled on purpose, and migrating it is currently **not** justified. The
decisive finding: the Vue `useChat` `throttle` option the docs advertise does not exist until
`@ai-sdk/vue@4.0.108`, and that line pins `ai` exactly — so adopting it at our pinned
`ai@7.0.97` would reinstate per-token reactive rendering, which is precisely the jank the
hand-rolled adaptive flush (`min(250, 60 + textLength/120)`) was written to avoid. `AbstractChat`
writes state once per chunk with no batching.

Other concrete blockers, all verified against source: `HttpChatTransport` hardcodes
`POST` + `Content-Type: application/json` + `JSON.stringify`, while our action is form-encoded
(so a custom `ChatTransport` is required); the framework-agnostic `Chat` class is deprecated in
favour of the composable; `regenerate()` assigns a fresh message id and truncates later messages,
whereas ours rewrites one Convex row in place; `stop()` is a client-side abort only, so our
cooperative `requestStop` stays necessary; and resume is React-only (`resume: true`) while our
server deliberately rejects SSE resume.

The response envelope already matches what the SDK parses, so nothing there needs to change.
If this is ever revisited, the low-risk shape is `AbstractChat` (already installed, no version
bump) plus a custom transport and our own throttled `ChatState` — adopt the chunk→parts state
machine, not the render loop.

