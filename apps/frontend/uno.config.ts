import {
  defineConfig,
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
import { codeIconMap } from './app/components/mdc/config'

const colorPalettePresets = ['primary', 'secondary', 'surface']
const colorsPaletteMap: Record<string, string> = {}
for (const color of colorPalettePresets) {
  // length 12 = 0-950
  Array.from({ length: 12 }, (_, i) => i).forEach((num) => {
    const key = `${color}-${colorIndexer(num)}`
    colorsPaletteMap[key] = `var(--${key})`
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
    [varName]: `var(--${varName})`,
    [`${varName}-foreground`]: `var(--${varName}-foreground)`,
    ...(additionalVars && additionalVars.reduce((acc, cur) => {
      acc[`${varName}-${cur}`] = `var(--${varName}-${cur})`
      return acc
    }, {} as Record<string, string>)),
  }
}

export default defineConfig({
  outputToCssLayers: true,
  theme: {
    // text: {
    //   h1: {
    //     fontSize: '40px',
    //     lineHeight: '48px',
    //   },
    //   h2: {
    //     fontSize: '32px',
    //     lineHeight: '40px',
    //   },
    //   h3: {
    //     fontSize: '24px',
    //     lineHeight: '32px',
    //   },
    //   h4: {
    //     fontSize: '20px',
    //     lineHeight: '28px',
    //   },
    //   body1: {
    //     fontSize: '18px',
    //     lineHeight: '26px',
    //   },
    //   body2: {
    //     fontSize: '16px',
    //     lineHeight: '24px',
    //   },
    //   body3: {
    //     fontSize: '14px',
    //     lineHeight: '20px',
    //   },
    //   body4: {
    //     fontSize: '12px',
    //     lineHeight: '16px',
    //   },
    // },
    ringWidth: {
      DEFAULT: '3px',
    },
    colors: {
      ...colorsPaletteMap,
      'mono': 'var(--mono)',
      'mono-i': 'var(--mono-i)',
      'background': 'var(--background)',
      'foreground': 'var(--foreground)',
      'border': 'var(--border)',
      'input': 'var(--input)',
      'ring': 'var(--ring)',
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
  extendTheme: (theme) => {
    return {
      ...theme,
      breakpoints: {
        ...theme.breakpoints,
        xs: '380px',
        fhd: '1920px',
        qhd: '2560px',
      },
    }
  },
  safelist: [
    ...Object.values(codeIconMap).map(i => `i-${i}`),
  ],
  shortcuts: [
    ['bg-mainGradient', 'bg-gradient-to-b from-primary via-primary to-secondary'],
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
    presetWind4({
      preflights: {
        reset: false, // We import the preflight reset ourself in main.scss
      },
    }),
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
