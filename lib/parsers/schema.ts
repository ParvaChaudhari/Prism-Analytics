export type InferredType = 'number' | 'boolean' | 'date' | 'string' | 'unknown'

export type ColumnSchema = {
  name: string
  type: InferredType
  nullCount: number
  uniqueCount: number
  sample: Array<string | number | boolean | null>
}

export type DatasetSchema = {
  columns: ColumnSchema[]
  rowCount: number
}

function isNullish(v: unknown) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

function looksBoolean(v: string) {
  const s = v.trim().toLowerCase()
  return s === 'true' || s === 'false' || s === 'yes' || s === 'no' || s === '0' || s === '1'
}

function looksNumber(v: string) {
  const s = v.trim()
  if (!s) return false
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n)
}

function looksDate(v: string) {
  const s = v.trim()
  if (!s) return false
  const t = Date.parse(s)
  return Number.isFinite(t)
}

function inferType(values: unknown[]): InferredType {
  const candidates = values.filter((v) => !isNullish(v)).slice(0, 50)
  if (candidates.length === 0) return 'unknown'

  let boolCount = 0
  let numCount = 0
  let dateCount = 0

  for (const v of candidates) {
    if (typeof v === 'boolean') {
      boolCount++
      continue
    }
    if (typeof v === 'number') {
      numCount++
      continue
    }
    if (typeof v === 'string') {
      if (looksBoolean(v)) boolCount++
      if (looksNumber(v)) numCount++
      if (looksDate(v)) dateCount++
    }
  }

  const threshold = Math.max(1, Math.floor(candidates.length * 0.8))
  if (numCount >= threshold) return 'number'
  if (boolCount >= threshold) return 'boolean'
  if (dateCount >= threshold) return 'date'
  return 'string'
}

export function buildSchemaFromRows(
  rows: Array<Record<string, unknown>>,
  sampleSizePerColumn = 5
): DatasetSchema {
  const columns = new Map<string, unknown[]>()
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!columns.has(key)) columns.set(key, [])
      columns.get(key)!.push(value)
    }
  }

  const columnSchemas: ColumnSchema[] = []
  for (const [name, values] of columns.entries()) {
    const nullCount = values.reduce((acc, v) => acc + (isNullish(v) ? 1 : 0), 0)
    const uniqueCount = new Set(
      values
        .filter((v) => !isNullish(v))
        .map((v) => (typeof v === 'string' ? v.trim() : JSON.stringify(v)))
    ).size

    const sample: ColumnSchema['sample'] = []
    for (const v of values) {
      if (sample.length >= sampleSizePerColumn) break
      if (isNullish(v)) continue
      if (typeof v === 'string') sample.push(v.slice(0, 200))
      else if (typeof v === 'number' || typeof v === 'boolean') sample.push(v)
      else sample.push(JSON.stringify(v).slice(0, 200))
    }

    columnSchemas.push({
      name,
      type: inferType(values),
      nullCount,
      uniqueCount,
      sample,
    })
  }

  return {
    columns: columnSchemas,
    rowCount: rows.length,
  }
}

