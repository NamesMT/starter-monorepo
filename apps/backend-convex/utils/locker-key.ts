/**
 * Generates a thread's share key.
 *
 * The key is the *only* credential protecting an anonymous thread: anyone holding it can read,
 * extend and delete that thread. It used to be built in the browser as
 * `locker_${Date.now()}_${randomStr(8)}`, where `randomStr` is `Math.random()` — 48 bits from a
 * non-cryptographic generator, behind a timestamp an attacker already knows.
 *
 * The Convex runtime provides Web Crypto (`crypto` is in its supported API list), so the key is
 * generated server-side from a CSPRNG. 32 bytes gives 256 bits, which makes guessing hopeless
 * rather than merely expensive.
 */
export function generateLockerKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))

  // base64url: URL-safe and short enough for a share link.
  return `locker_${base64Url(bytes)}`
}

function base64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
