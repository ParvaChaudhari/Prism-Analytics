import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx')

export async function parseExcelFile(
  file: ArrayBuffer,
  maxRows = 10000
): Promise<Array<Record<string, unknown>>> {
  const workbook = XLSX.read(file, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
  })

  return rows.slice(0, maxRows)
}

