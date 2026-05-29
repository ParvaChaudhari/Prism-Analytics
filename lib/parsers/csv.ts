import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Papa = require('papaparse') as {
  parse: typeof import('papaparse').parse
}

export async function parseCsvFile(
  file: ArrayBuffer,
  maxRows = 10000
): Promise<Array<Record<string, unknown>>> {
  const text = new TextDecoder('utf-8').decode(file)

  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  if (parsed.errors?.length) {
    const first = parsed.errors[0]
    throw new Error(first.message || 'Failed to parse CSV')
  }

  const rows = parsed.data ?? []
  return rows.slice(0, maxRows)
}

