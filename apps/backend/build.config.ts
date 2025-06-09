import dynamicImportVars from '@rollup/plugin-dynamic-import-vars'
import { defineBuildConfig } from 'unbuild'

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
  hooks: {
    'rollup:options': function (_ctx, options) {
      options.plugins = [options.plugins, dynamicImportVars()]
    },
  },
})
