import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import presetAnimations from 'unocss-preset-animations'
import { presetShadcn } from 'unocss-preset-shadcn'

import { parseColor } from 'unocss/preset-mini'

const colorsPaletteMap: Record<string, string> = {}
for (const color of ['primary', 'surface']) {
  // length 12 = 0-950
  Array.from({ length: 12 }, (_, i) => i).forEach((num) => {
    const key = `${color}-${colorIndexer(num)}`
    colorsPaletteMap[key] = `hsl(var(--${key}))`
  })
}
// Generates color index following the pattern: 0 50 100 200..900 950 1000
function colorIndexer(num: number) {
  let res = 0
  while (num > 0) {
    --num
    res += (res < 100 || res >= 900) ? 50 : 100
  }

  return res
}

export default defineConfig({
  theme: {
    ringWidth: {
      DEFAULT: '3px',
    },
    colors: {
      // Used by both shadcn and primevue
      'primary': {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },

      'primary-inverse': 'hsl(var(--primary-inverse))',
      'primary-hover': 'hsl(var(--primary-hover))',
      'primary-active-color': 'hsl(var(--primary-active-color))',

      'primary-highlight': 'hsl(var(--primary)/var(--primary-highlight-opacity))',
      'primary-highlight-inverse': 'hsl(var(--primary-highlight-inverse))',
      'primary-highlight-hover': 'hsl(var(--primary)/var(--primary-highlight-hover-opacity))',

      ...colorsPaletteMap,
    },
  },
  shortcuts: [
  ],
  rules: [
    // Declaring css variable with Uno: $mainColor-primary-500
    [/^\$(\w+)-(.+)$/, ([, name, value], { theme }) => ({
      [`--${name}`]: parseColor(value!, theme)?.color || value,
    })],
    // Re-declare to fix priority issue with some primevue components
    ['rounded-none', { 'border-radius': '0px' }],
    // bg dimming
    [/^bg-dim-(\d+)$/, ([, v]) => ({
      'background-image': `linear-gradient(rgba(0, 0, 0, ${+v! / 100}), rgba(0, 0, 0, ${+v! / 100}))`,
    })],
    // bg lighten
    [/^bg-lighten-(\d+)$/, ([, v]) => ({
      'background-image': `linear-gradient(rgba(255, 255, 255, ${+v! / 100}), rgba(255, 255, 255, ${+v! / 100}))`,
    })],
  ],
  variants: [
    {
      // nth-[]:class
      name: ':nth-child()',
      match: (matcher) => {
        const match = matcher.match(/^nth-\[(.+?)\]:/)
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
    presetWind4(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/',
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        sans: {
          name: 'Chivo',
          weights: ['100..900'],
          italic: true,
        },
        mono: {
          name: 'Chivo Mono',
          weights: ['100..900'],
          italic: true,
        },
      },
    }),
    presetAnimations(),
    presetShadcn({ color: false, radius: false }, { globals: false }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup({ separators: [':'] }),
  ],
  content: {
    pipeline: {
      include: [
        // Default
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
        // shadcn js/ts files
        'lib/components/ui/**/*.{js,ts}',
      ],
    },
  },
})
