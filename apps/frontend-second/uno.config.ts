import commonUnoConfig from '@local/nuxt-layer-common/uno.config'
import { mergeConfigs } from 'unocss'

// The layer's own `uno.config.ts` is not auto-discovered; re-export it here.
export default mergeConfigs([commonUnoConfig, {}])
