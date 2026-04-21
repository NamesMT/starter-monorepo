import {
  defineConfig,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import { parseColor } from 'unocss/preset-mini'

const nthChildMatcher = /^nth-\[(.+?)\]:/

export default defineConfig({
  shortcuts: [
  ],
  rules: [
    // Declaring css variable with Uno: $mainColor-primary-500
    [/^\$(\w+)-(.+)$/, ([, name, value], { theme }) => ({
      [`--${name}`]: parseColor(value!, theme)?.color || value,
    })],
  ],
  variants: [
    {
      // nth-[]:class
      name: ':nth-child()',
      match: (matcher) => {
        const match = matcher.match(nthChildMatcher)
        if (!match)
          return matcher
        return {
          // slice `hover:` prefix and passed to the next variants and rules
          matcher: matcher.substring(match[0].length),
          selector: s => `${s}:nth-child(${match[1]})`,
        }
      },
      multiPass: true,
    },
  ],
  presets: [
    presetUno(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup({ separators: [':'] }),
  ],
})
