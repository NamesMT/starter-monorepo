/**
 * Generates a thread's share key: 32 random bytes from Web Crypto, base64url encoded.
 *
 * The key is an anonymous thread's only credential, so it is minted here rather than in the
 * browser, where it was 48 bits of `Math.random()` behind a known timestamp.
 */
export function generateLockerKey() {
  return `locker_${base64Url(crypto.getRandomValues(new Uint8Array(32)))}`
}

function base64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
