export type InferredType = 'number' | 'boolean' | 'date' | 'string' | 'list' | 'unknown'

export type ColumnSchema = {
  name: string
  type: InferredType
  nullCount: number
  uniqueCount: number
  sample: Array<string | number | boolean | null>
  min?: number
  max?: number
}

export type DatasetSchema = {
  columns: ColumnSchema[]
  rowCount: number
}

function isNullish(v: unknown) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

function looksBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return true
  if (typeof v !== 'string') return false
  const s = v.trim().toLowerCase()
  return s === 'true' || s === 'false' || s === 'yes' || s === 'no' || s === '0' || s === '1'
}

function looksNumber(v: unknown): boolean {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Excel serials in date range are classified as dates, not plain numbers
    if (v >= 30000 && v <= 50000 && excelSerialToDate(v) !== null) return false
    return true
  }
  if (typeof v !== 'string') return false
  const s = v.trim()
  if (!s) return false
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n)
}

function excelSerialToDate(serial: number): Date | null {
  if (serial < 1 || serial > 2958465) return null
  const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
  return Number.isNaN(date.getTime()) ? null : date
}

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
  /^[A-Za-z]+ \d{1,2},? \d{4}$/,
]

function looksLikeDate(v: unknown): boolean {
  if (typeof v === 'string') {
    return DATE_PATTERNS.some((p) => p.test(v.trim())) && !Number.isNaN(Date.parse(v))
  }
  if (typeof v === 'number') {
    return v >= 30000 && v <= 50000 && excelSerialToDate(v) !== null
  }
  return false
}

function looksLikeList(v: unknown): boolean {
  if (typeof v !== 'string') return false
  const s = v.trim()
  if (!s.includes(',')) return false
  if (looksNumber(s)) return false
  if (looksLikeDate(s)) return false
  return true
}

function inferType(values: unknown[]): InferredType {
  const candidates = values.filter((v) => !isNullish(v)).slice(0, 50)
  if (!candidates.length) return 'string'

  const threshold = Math.max(1, Math.floor(candidates.length * 0.8))

  let numCount = 0
  let boolCount = 0
  let dateCount = 0
  let listCount = 0

  for (const v of candidates) {
    if (looksLikeDate(v)) {
      dateCount++
    } else if (looksNumber(v)) {
      numCount++
    } else if (looksBoolean(v)) {
      boolCount++
    } else if (looksLikeList(v)) {
      listCount++
    }
  }

  if (dateCount >= threshold) return 'date'
  if (numCount >= threshold) return 'number'
  if (boolCount >= threshold) return 'boolean'
  if (listCount >= Math.max(1, Math.floor(candidates.length * 0.5))) return 'list' // Lists only need 50% threshold
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
    const nullCount = values.reduce<number>((acc, v) => acc + (isNullish(v) ? 1 : 0), 0)
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
      // For numeric columns, compute min/max if possible
      ...(inferType(values) === 'number'
        ? (() => {
            const nums = values
              .map((v) => (typeof v === 'string' ? Number(v.replace(/,/g, '')) : v))
              .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
            return {
              min: nums.length ? Math.min(...nums) : undefined,
              max: nums.length ? Math.max(...nums) : undefined,
            }
          })()
        : {}),
    })
  }

  return {
    columns: columnSchemas,
    rowCount: rows.length,
  }
}

