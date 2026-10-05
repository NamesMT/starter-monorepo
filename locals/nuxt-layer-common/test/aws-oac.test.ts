import type { AddressInfo } from 'node:net'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { describe, expect, it } from 'vitest'
import { buildOacPayload } from '../app/utils/aws-oac'

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}

/**
 * `x-amz-content-sha256` must hash the bytes that are actually sent, so every case
 * asserts against a real `fetch` to a throwaway server, not just the returned value.
 */
async function sendAndCapture(body: BodyInit) {
  const received: { bytes?: Uint8Array, contentType?: string } = {}
  const server = createServer((req, res) => {
    const chunks: Uint8Array[] = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      received.bytes = concatBytes(chunks)
      received.contentType = req.headers['content-type']
      res.end('ok')
    })
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
  const { port } = server.address() as AddressInfo

  try {
    const payload = await buildOacPayload(body)
    expect(payload).toBeDefined()

    const headers = new Headers()
    headers.set('x-amz-content-sha256', payload!.payloadHash)
    let sent: BodyInit | null = body
    if (payload!.replaceBody) {
      sent = payload!.bytes
      if (payload!.contentType)
        headers.set('content-type', payload!.contentType)
    }

    await fetch(`http://127.0.0.1:${port}`, { method: 'POST', body: sent, headers })
    return { payload: payload!, received }
  }
  finally {
    server.close()
  }
}

describe('buildOacPayload', () => {
  it('hashes the bytes a string body is sent as, keeping the default content type', async () => {
    const { payload, received } = await sendAndCapture('{"a":1}')

    expect(payload.payloadHash).toBe(sha256(received.bytes!))
    expect(received.contentType).toMatch(/^text\/plain/)
  })

  it('hashes multipart bytes and forwards the boundary they were serialized with', async () => {
    const form = new FormData()
    form.append('a', 'hello')
    form.append('file', new Blob([new Uint8Array([1, 2, 3])]), 'x.bin')

    const { payload, received } = await sendAndCapture(form)

    expect(received.contentType).toMatch(/^multipart\/form-data; boundary=/)
    expect(payload.contentType).toBe(received.contentType)
    expect(payload.payloadHash).toBe(sha256(received.bytes!))
  })

  it('hashes URLSearchParams, a Blob and raw buffers', async () => {
    for (const body of [
      new URLSearchParams({ a: '1' }),
      new Blob(['hello'], { type: 'text/plain' }),
      new Uint8Array([1, 2, 3]),
      new TextEncoder().encode('buf').buffer as ArrayBuffer,
    ]) {
      const { payload, received } = await sendAndCapture(body)
      expect(payload.payloadHash).toBe(sha256(received.bytes!))
    }
  })

  it('hashes only the visible slice of an offset view', async () => {
    const { payload, received } = await sendAndCapture(new Uint8Array([9, 1, 2, 3, 9]).subarray(1, 4))

    expect(received.bytes).toEqual(new Uint8Array([1, 2, 3]))
    expect(payload.payloadHash).toBe(sha256(received.bytes!))
  })

  it('materializes a stream so it can be hashed, and sends those bytes', async () => {
    const { payload, received } = await sendAndCapture(new Blob(['streamed']).stream() as ReadableStream)

    expect(payload.replaceBody).toBe(true)
    expect(payload.payloadHash).toBe(sha256(received.bytes!))
  })

  it('returns undefined for a body it cannot serialize', async () => {
    // @ts-expect-error deliberately unsupported
    await expect(buildOacPayload({ nope: true })).resolves.toBeUndefined()
  })
})
