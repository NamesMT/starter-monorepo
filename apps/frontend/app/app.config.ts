export default defineAppConfig({
  name: 'starter-monorepo',
  /**
   * Enable `/api/*` proxy to the backendUrl.
   *
   * Possible values: true | false | 'auto.
   *
   * See [README#apps-and-packages](../../../README.md)
   */
  enableProxy: 'auto' as 'auto' | true | false,
})
