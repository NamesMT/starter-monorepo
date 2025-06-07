import { scanConvert } from 'spreadsheet-i18n'

scanConvert(
  {
    outDir: 'dist',
    preserveStructure: true,
  },
  'src/sheets',
)
