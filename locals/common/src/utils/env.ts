import { readFile } from 'node:fs/promises'
import { parse } from 'dotenv'

export async function parseEnv(envText: string) {
  return parse(envText)
}

export async function parseEnvFile(envFile: string) {
  const envText = await readFile(envFile, 'utf-8')
  return parseEnv(envText)
}
