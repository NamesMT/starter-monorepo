import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import presetAnimations from 'unocss-preset-animations'
import { presetShadcn } from 'unocss-preset-shadcn'
import { parseColor } from 'unocss/preset-mini'

const colorPalettePresets = ['primary', 'secondary', 'surface']
const colorsPaletteMap: Record<string, string> = {}
for (const color of colorPalettePresets) {
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

/**
 * Generates common color variables like `DEFAULT`, `foreground`
 */
function commonColorVarsGen(varName: string, additionalVars?: Array<string>) {
  return {
    [varName]: `hsl(var(--${varName}))`,
    [`${varName}-foreground`]: `hsl(var(--${varName}-foreground))`,
    ...(additionalVars && additionalVars.reduce((acc, cur) => {
      acc[`${varName}-${cur}`] = `hsl(var(--${varName}-${cur}))`
      return acc
    }, {} as Record<string, string>)),
  }
}

export default defineConfig({
  theme: {
    ringWidth: {
      DEFAULT: '3px',
    },
    colors: {
      ...colorsPaletteMap,
      'mono': 'hsl(var(--mono))',
      'mono-i': 'hsl(var(--mono-i))',
      'background': 'hsl(var(--background))',
      'foreground': 'hsl(var(--foreground))',
      'border': 'hsl(var(--border))',
      'input': 'hsl(var(--input))',
      'ring': 'hsl(var(--ring))',
      ...colorPalettePresets.reduce((acc, cur) => {
        Object.assign(acc, commonColorVarsGen(cur))
        return acc
      }, {} as Record<string, Record<string, string>>),
      ...commonColorVarsGen('destructive'),
      ...commonColorVarsGen('muted'),
      ...commonColorVarsGen('accent'),
      ...commonColorVarsGen('popover'),
      ...commonColorVarsGen('card'),

      ...commonColorVarsGen('sidebar', [
        'primary',
        'primary-foreground',
        'accent',
        'accent-foreground',
        'border',
        'ring',
      ]),
    },
  },
  shortcuts: [
    ['bg-mainGradient', 'bg-gradient-to-b from-primary via-primary to-violet-400'],
    ['text-mainGradient', 'bg-mainGradient bg-clip-text text-transparent transition-color duration-200'],
  ],
  rules: [
    // Declaring css variable with theme color support: $mainColor=primary-500
    // Tip: you can use [--someVariable:var(--primary)] as native supported syntax for other variables
    [/^\$([\w-]+)=(.+)$/, ([, name, value], { theme }) => ({
      [`--${name}`]: parseColor(value!, theme)?.color || value,
    })],
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
    presetWind3(),
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
      timeouts: {
        warning: 3000,
        failure: 10000,
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
        'lib/shadcn//**/*.{js,ts}',
      ],
    },
  },
})
