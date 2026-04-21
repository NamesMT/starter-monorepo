import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/aws.ts'],
  deps: {
    neverBundle: [/^@aws-sdk/],
    onlyBundle: false,
  },
  dts: false,
})
