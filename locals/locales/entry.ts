import { scanConvert } from 'spreadsheet-i18n'

// Raw buckets: `i18n.csv` -> `dist/<locale>.json`, `frontend|backend/i18n.csv` -> `dist/<bucket>/...`.
await scanConvert(
  {
    outDir: 'dist',
    preserveStructure: true,
  },
  'src/sheets',
)

// Fold the shared (global) bucket into the frontend bucket: the frontend has a single
// `translationDir`, and with `preserveStructure: false` both sheets land on
// `dist/frontend/<locale>.json` (unioned by the default `mergeOutput`). Pages stay page-scoped.
await scanConvert(
  {
    outDir: 'dist/frontend',
    include: ['i18n.csv', 'frontend/i18n.csv'],
    preserveStructure: false,
  },
  'src/sheets',
)
