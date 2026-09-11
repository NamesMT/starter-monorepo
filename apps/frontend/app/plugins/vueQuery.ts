import type { AsyncStorage, PersistedQuery } from '@tanstack/query-persist-client-core'
import type { UseStore } from 'idb-keyval'
import { experimental_createQueryPersister } from '@tanstack/query-persist-client-core'
import { QueryClient } from '@tanstack/vue-query'
import { createStore, del, get, set } from 'idb-keyval'

function newIdbStorage(idbStore: UseStore): AsyncStorage<PersistedQuery> {
  return {
    getItem: async key => await get(key, idbStore),
    setItem: async (key, value) => await set(key, value, idbStore),
    removeItem: async key => await del(key, idbStore),
  }
}

/**
 * Hands `@peterbud/nuxt-query` a pre-configured `QueryClient`.
 *
 * Must stay `enforce: 'pre'` so the hook is registered before `nuxt-query:plugin`
 * awaits it - options that need runtime code (the IndexedDB persister below) can't
 * live in the module's static `queryClientOptions`.
 */
export default defineNuxtPlugin({
  name: 'local-vue-query',
  enforce: 'pre',
  setup(nuxtApp) {
    nuxtApp.hook('nuxt-query:configure', (getPluginOptions) => {
      const maxAge = 1000 * 60 * 60 * 12 // 12 hours

      getPluginOptions(new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: maxAge,
            // Only enable Tanstack Query on client-side
            enabled: import.meta.client,
            // Set default staleTime to Infinity to manually invalidate the query only when needed
            staleTime: Infinity,
            // Set client-side persister to IndexedDB
            persister: !import.meta.client
              ? undefined
              : experimental_createQueryPersister<PersistedQuery>({
                storage: newIdbStorage(createStore('tsq_db', 'tsq_store')),
                maxAge,
                serialize: persistedQuery => persistedQuery,
                deserialize: cached => cached,
              }).persisterFn,
          },
        },
      }))
    })
  },
})
