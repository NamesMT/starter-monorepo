import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { cssUnit } from '@local/common/src/utils/css'
export type { LooseCSSUnit } from '@local/common/src/utils/css'
