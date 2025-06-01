import { defineBuildConfig } from 'unbuild'
import sharedConfig from './shared.config'

export default defineBuildConfig({
  entries: [
    // normal bundles
    'src/aws',

    // file-to-file (please use .mts for all of your files), currently mkdist uncontrollably generates .d.ts and .d.mts based on the original extension: .ts or .mts
    // {
    //   builder: 'mkdist',
    //   input: './src/',
    //   esbuild: { minify: true },
    // },
  ],
  declaration: false,
  clean: true,
  externals: [/^@aws-sdk/],
  rollup: {
    inlineDependencies: true,
    esbuild: {
      target: 'esnext',
      // minify: true,
    },
  },
  ...sharedConfig,
})
