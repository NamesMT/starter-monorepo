import { tool } from 'ai'
import { z } from 'zod'

/**
 * Evaluates a basic arithmetic expression safely (no `eval`/`Function`).
 *
 * Supports `+ - * / % ^`, parentheses and unary signs. Throws on invalid input.
 */
function evaluateArithmetic(expression: string): number {
  const tokens = expression.replace(/\s+/g, '')
  let index = 0

  const peek = () => tokens[index]

  function parseExpression(): number {
    let value = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const operator = tokens[index++]
      const right = parseTerm()
      value = operator === '+' ? value + right : value - right
    }
    return value
  }

  function parseTerm(): number {
    let value = parsePower()
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const operator = tokens[index++]
      const right = parsePower()
      value = operator === '*' ? value * right : operator === '/' ? value / right : value % right
    }
    return value
  }

  function parsePower(): number {
    const base = parseUnary()
    if (peek() === '^') {
      index++
      return base ** parsePower()
    }
    return base
  }

  function parseUnary(): number {
    if (peek() === '-') {
      index++
      return -parseUnary()
    }
    if (peek() === '+') {
      index++
      return parseUnary()
    }
    return parseAtom()
  }

  function parseAtom(): number {
    if (peek() === '(') {
      index++
      const value = parseExpression()
      if (peek() !== ')')
        throw new Error('Unbalanced parentheses')
      index++
      return value
    }

    const start = index
    while (index < tokens.length && /[\d.]/.test(tokens[index]!))
      index++

    if (start === index)
      throw new Error(`Unexpected character "${tokens[index] ?? '<end>'}"`)

    const literal = tokens.slice(start, index)
    const value = Number(literal)
    if (!Number.isFinite(value))
      throw new Error(`Invalid number "${literal}"`)
    return value
  }

  const result = parseExpression()
  if (index !== tokens.length)
    throw new Error(`Unexpected character "${tokens[index]}"`)
  if (!Number.isFinite(result))
    throw new Error('Result is not a finite number')
  return result
}

/**
 * Built-in tools offered to models that opted into tool use.
 *
 * Kept intentionally small and dependency-free; MCP-provided tools (issue #40) can be
 * merged into this registry later.
 */
export const chatTools = {
  getCurrentTime: tool({
    description: 'Get the current date and time. Use it whenever the user asks about the present time or date.',
    inputSchema: z.object({
      timeZone: z.string().optional().describe('IANA time zone, e.g. "Asia/Ho_Chi_Minh". Defaults to UTC.'),
    }),
    execute: async ({ timeZone }) => {
      const now = new Date()
      const zone = timeZone || 'UTC'

      let formatted: string
      try {
        formatted = new Intl.DateTimeFormat('en-US', {
          dateStyle: 'full',
          timeStyle: 'long',
          timeZone: zone,
        }).format(now)
      }
      catch {
        formatted = now.toISOString()
      }

      return { iso: now.toISOString(), timeZone: zone, formatted }
    },
  }),

  calculate: tool({
    description: 'Evaluate a basic arithmetic expression. Supports +, -, *, /, %, ^ and parentheses.',
    inputSchema: z.object({
      expression: z.string().describe('The expression to evaluate, e.g. "(2 + 3) * 4".'),
    }),
    execute: async ({ expression }) => {
      try {
        return { expression, result: evaluateArithmetic(expression) }
      }
      catch (error) {
        return { expression, error: (error as Error).message }
      }
    },
  }),
}
