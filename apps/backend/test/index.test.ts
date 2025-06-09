import { logger } from '#src/helpers/logger.js'
import { expect, it } from 'vitest'

it('logger', () => {
  expect(logger).toHaveProperty('info')
})
