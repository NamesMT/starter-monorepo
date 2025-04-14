import { destr } from 'destr'

const nullBodyResponses = new Set([101, 204, 205, 304])

interface omResponse extends Response {
  _data: any
}

/**
 * Oh my fetch, smartly parse the response data based on ofetch
 */
export async function omFetch(fetchRes: Response) {
  const _fetchRes = fetchRes as unknown as omResponse

  const hasBody = fetchRes.body && !nullBodyResponses.has(_fetchRes.status)

  if (hasBody) {
    const responseType = detectResponseType(_fetchRes.headers.get('content-type') || '')

    // We override the `.json()` method to parse the body more securely with `destr`
    switch (responseType) {
      case 'json': {
        const data = await _fetchRes.text()
        _fetchRes._data = destr(data)
        break
      }
      default: {
        _fetchRes._data = await _fetchRes[responseType]()
      }
    }
  }

  if (!_fetchRes.ok) {
    throw createFetchError(_fetchRes)
  }

  return _fetchRes._data
}

export function createFetchError(fetchRes: Response) {
  const statusStr = fetchRes
    ? `${fetchRes.status} ${fetchRes.statusText}`
    : '<no response>'

  const message = `${statusStr}`

  const fetchError = new Error(
    message,
  )

  for (const [key, refKey] of [
    ['data', '_data'],
    ['statusCode', 'status'],
    ['statusText', 'statusText'],
  ] as const) {
    Object.defineProperty(fetchError, key, {
      get() {
        // @ts-expect-error _data does not exist on Response
        return fetchRes && fetchRes[refKey]
      },
    })
  }

  return fetchError
}

// // Below block are from ofetch/utils
const textTypes = new Set([
  'image/svg',
  'application/xml',
  'application/xhtml',
  'application/html',
])
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(?:;.+)?$/i
// This provides reasonable defaults for the correct parser based on Content-Type header.
export function detectResponseType(_contentType = ''): 'json' | 'text' | 'blob' {
  if (!_contentType) {
    return 'json'
  }

  // Value might look like: `application/json; charset=utf-8`
  const contentType = _contentType.split(';').shift() || ''

  if (JSON_RE.test(contentType)) {
    return 'json'
  }

  if (textTypes.has(contentType) || contentType.startsWith('text/')) {
    return 'text'
  }

  return 'blob'
}
