/**
 * Asserts the published OpenAPI contract. Run against a live server:
 *
 *   pnpm -F=backend openapi:assert            # https://127.0.0.1:3400
 *   BASE_URL=https://example.com pnpm -F=backend openapi:assert
 *
 * Checks only what the spec must guarantee for public docs; it does not snapshot the whole
 * document, so adding routes does not require touching this file.
 */
import process from 'node:process'

const baseUrl = process.env.BASE_URL ?? 'https://127.0.0.1:3400'
const specUrl = `${baseUrl}/api/openapi/spec.json`
const uiUrl = `${baseUrl}/api/openapi/ui`

/** Routes that must stay out of the public document (dev-only / machine-only). */
const mustBeHidden = ['/api/dummy/grammy']

const failures: string[] = []
const warnings: string[] = []
function check(condition: boolean, message: string) {
  if (!condition)
    failures.push(message)
}
function warn(condition: boolean, message: string) {
  if (!condition)
    warnings.push(message)
}

const res = await fetch(specUrl).catch((e: unknown) => {
  throw new Error(`Cannot reach ${specUrl}: ${(e as Error).message}`)
})
check(res.status === 200, `${specUrl} returned ${res.status}`)

const spec = await res.json() as {
  openapi: string
  info: { title?: string, description?: string }
  tags?: { name: string, description?: string }[]
  components?: Record<string, unknown>
  paths: Record<string, Record<string, Record<string, any>>>
}

check(Boolean(spec.openapi), 'missing `openapi` version')
check(Boolean(spec.info.description && spec.info.description.length > 200), 'info.description is too thin to be an API intro')

const declaredTags = new Set((spec.tags ?? []).map(t => t.name))
for (const tag of spec.tags ?? [])
  check(Boolean(tag.description), `tag \`${tag.name}\` has no description`)

const operations = Object.entries(spec.paths).filter(([, item]) => item && typeof item === 'object')
check(operations.length > 0, 'the spec documents no operations at all')

for (const [path, pathItem] of operations) {
  for (const [method, operation] of Object.entries(pathItem)) {
    const id = `${method.toUpperCase()} ${path}`
    check(Boolean(operation.summary), `${id}: missing summary`)
    check(typeof operation.summary === 'string' && operation.summary.split(/\s+/).length <= 7, `${id}: summary is longer than 7 words`)

    const tags: string[] = operation.tags ?? []
    check(tags.length > 0, `${id}: missing tag`)
    for (const tag of tags)
      check(declaredTags.has(tag), `${id}: tag \`${tag}\` is not declared in the document's tag list`)

    check(Boolean(operation.responses && Object.keys(operation.responses).length > 0), `${id}: missing responses`)
    for (const [status, response] of Object.entries(operation.responses ?? {})) {
      // A guarded route must carry `security` wherever it declares a 401.
      if (status === '401')
        check(Array.isArray(operation.security) && operation.security.length > 0, `${id}: has a 401 but no \`security\``)
      if (status === '400') {
        const content = (response as any)?.content ?? {}
        const schema = content['application/json']?.schema
        // A JSON 400 must use the shared error body; a non-JSON 400 (e.g. AuthKit's plain-text
        // callback) is allowed but flagged, so the inconsistency stays visible.
        if (schema)
          check(schema.$ref === '#/components/schemas/Error', `${id}: JSON 400 does not reference the shared \`Error\` schema`)
        else
          warn(false, `${id}: 400 is not JSON, so it cannot use the \`Error\` schema`)
      }
    }
  }
}

// Every guarded operation (the generator emits `security` only via the auth middleware).
const guarded = Object.entries(spec.paths).flatMap(([path, item]) =>
  Object.entries(item ?? {})
    .filter(([, op]) => Array.isArray(op.security) && op.security.length > 0)
    .map(([method]) => `${method.toUpperCase()} ${path}`),
)
check(guarded.length > 0, 'no operation advertises `security`; the auth middleware is not documenting itself')

// A route the middleware guards must carry the session scheme, not merely some scheme: a typo'd
// name would still produce a `security` array and pass the check above.
const sessionScheme = Object.keys((spec.components as any)?.securitySchemes ?? {})[0]
for (const id of guarded) {
  const [method, path] = id.split(' ')
  const requirement = spec.paths[path]?.[method.toLowerCase()]?.security as Record<string, unknown>[] | undefined
  check(
    Boolean(requirement?.some(entry => sessionScheme in entry || Object.keys(entry).length === 0)),
    `${id}: \`security\` does not reference the session scheme \`${sessionScheme}\``,
  )
}

const components = (spec.components ?? {}) as Record<string, Record<string, unknown>>
check(Boolean(components.schemas?.Error), 'missing shared `Error` schema')
check(Boolean(components.securitySchemes && Object.keys(components.securitySchemes).length > 0), 'missing `securitySchemes`')

// Declared security schemes must be the ones operations reference.
const referencedSchemes = new Set(
  Object.values(spec.paths).flatMap(item => Object.values(item ?? {})).flatMap(op => (op.security ?? []) as Record<string, unknown>[]).flatMap(requirement => Object.keys(requirement)),
)
for (const scheme of referencedSchemes)
  check(Boolean(components.securitySchemes?.[scheme]), `operation references undeclared security scheme \`${scheme}\``)

for (const path of mustBeHidden)
  check(!(spec.paths as Record<string, unknown>)[path], `${path} must be hidden from the public spec`)

// The UI must render, and must load a pinned Scalar bundle rather than the floating default.
const ui = await fetch(uiUrl)
check(ui.status === 200, `${uiUrl} returned ${ui.status}`)
const html = await ui.text()
check(/@scalar\/api-reference@\d+\.\d+\.\d+/.test(html), 'the Scalar UI does not pin an exact @scalar/api-reference version')
check(html.includes(`"telemetry":false`) || html.includes('"telemetry": false'), 'the Scalar UI does not disable telemetry')

// The spec must be served under the public prefix, not at the app root.
const legacy = await fetch(`${baseUrl}/openapi/spec.json`)
check(legacy.status === 404, `/openapi/spec.json should not exist (got ${legacy.status}); the spec belongs under /api`)

if (failures.length) {
  console.error(`\n${failures.length} OpenAPI assertion(s) failed:\n`)
  for (const failure of failures) console.error(`  ✗ ${failure}`)
  if (warnings.length) {
    console.error('\nWarnings:')
    for (const warning of warnings) console.error(`  ! ${warning}`)
  }
  process.exit(1)
}

for (const warning of warnings) console.warn(`  ! ${warning}`)
console.log(`OpenAPI assertions passed: ${operations.length} paths, ${guarded.length} guarded operation(s).`)
