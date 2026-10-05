/**
 * Payload hashing for a Lambda function URL fronted by CloudFront OAC.
 *
 * `x-amz-content-sha256` must hold the SHA-256 of the exact bytes CloudFront forwards, and
 * Lambda rejects unsigned payloads on `POST`/`PUT`.
 *
 * `fetch` picks a random multipart boundary every time it serializes a `FormData`, so hashing
 * a separately built copy can never match the bytes actually sent. We therefore serialize once
 * with a `Response` — the same serializer `fetch` uses — and send exactly those bytes. The
 * boundary lives in the serialized `content-type`, so it has to travel with them.
 */
export interface OacPayload {
  payloadHash: string
  /** `true` when the body had to be materialized, so the serialized `bytes` must be sent instead. */
  replaceBody: boolean
  /** Backed by a plain `ArrayBuffer` so it stays assignable to `BodyInit`. */
  bytes: Uint8Array<ArrayBuffer>
  /** Set only when the replacement body needs a content type `fetch` would no longer derive. */
  contentType?: string
}

/**
 * Hashes `body` for the `x-amz-content-sha256` header.
 *
 * Bodies `fetch` would send verbatim are hashed in place and left untouched, so their default
 * content types survive; only `FormData` and streams are materialized and replaced.
 * Returns `undefined` for a body type we cannot serialize, leaving the caller to forward it.
 */
export async function buildOacPayload(body: BodyInit): Promise<OacPayload | undefined> {
  let bytes: Uint8Array<ArrayBuffer> | undefined
  let replaceBody = false
  let contentType: string | undefined

  if (typeof body === 'string') {
    bytes = new TextEncoder().encode(body)
  }
  else if (body instanceof URLSearchParams) {
    bytes = new TextEncoder().encode(body.toString())
  }
  else if (body instanceof FormData) {
    const serialized = new Response(body)
    bytes = new Uint8Array(await serialized.arrayBuffer())
    contentType = serialized.headers.get('content-type') ?? undefined
    replaceBody = true
  }
  else if (body instanceof Blob) {
    bytes = new Uint8Array(await body.arrayBuffer())
  }
  else if (body instanceof ReadableStream) {
    // Reading the stream also drops the need for a `duplex: 'half'` request option.
    bytes = new Uint8Array(await new Response(body).arrayBuffer())
    replaceBody = true
  }
  else if (ArrayBuffer.isView(body)) {
    // Copy out of the view: its buffer may be a `SharedArrayBuffer`, which `digest` rejects,
    // and the view may cover only part of it.
    const view = new Uint8Array(body.buffer as ArrayBuffer, body.byteOffset, body.byteLength)
    bytes = new Uint8Array(view)
  }
  else if (body instanceof ArrayBuffer) {
    bytes = new Uint8Array(body)
  }

  if (!bytes)
    return undefined

  const digest = await crypto.subtle.digest('SHA-256', bytes)

  return {
    payloadHash: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''),
    replaceBody,
    bytes,
    contentType,
  }
}
