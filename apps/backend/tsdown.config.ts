import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/aws.ts'],
  external: [/^@aws-sdk/],
  dts: false,
})
