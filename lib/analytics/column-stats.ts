import type { ColumnSchema, DatasetSchema, InferredType } from '@/lib/parsers/schema'

function isNullish(v: unknown) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.trim().replace(/,/g, '').replace(/[$%]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function pct(count: number, total: number) {
  if (!total) return '0%'
  return `${((count / total) * 100).toFixed(1)}%`
}

function mean(nums: number[]) {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function median(nums: number[]) {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function stdDev(nums: number[]) {
  if (nums.length < 2) return 0
  const m = mean(nums)
  const variance = nums.reduce((acc, n) => acc + (n - m) ** 2, 0) / nums.length
  return Math.sqrt(variance)
}

export type NumericColumnStats = {
  name: string
  type: 'numeric'
  nullCount: number
  nullPercent: string
  uniqueCount: number
  min: number
  max: number
  mean: number
  median: number
  stdDev: number
  sample: number[]
}

export type CategoricalColumnStats = {
  name: string
  type: 'categorical'
  nullCount: number
  nullPercent: string
  uniqueCount: number
  topValues: Array<{ value: string; count: number }>
}

export type DateColumnStats = {
  name: string
  type: 'date'
  nullCount: number
  nullPercent: string
  min: string
  max: string
  rangeMonths: number
  granularity: 'daily' | 'weekly' | 'monthly'
}

export type ColumnStats = NumericColumnStats | CategoricalColumnStats | DateColumnStats

export type DatasetMetadata = {
  rowCount: number
  columnCount: number
  dateColumns: string[]
  numericColumns: string[]
  categoricalColumns: string[]
  likelyDatasetType: string
}

export type EnrichedDatasetContext = {
  metadata: DatasetMetadata
  columnStats: ColumnStats[]
  schema: DatasetSchema
}

function detectDateGranularity(dates: Date[]): 'daily' | 'weekly' | 'monthly' {
  if (dates.length < 2) return 'daily'
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const gaps: number[] = []
  for (let i = 1; i < Math.min(sorted.length, 50); i++) {
    gaps.push(sorted[i].getTime() - sorted[i - 1].getTime())
  }
  const avgGap = mean(gaps)
  const day = 86400000
  if (avgGap > day * 20) return 'monthly'
  if (avgGap > day * 2) return 'weekly'
  return 'daily'
}

function statsForColumn(
  name: string,
  inferredType: InferredType,
  values: unknown[],
  rowCount: number
): ColumnStats | null {
  const nullCount = values.filter(isNullish).length
  const nonNull = values.filter((v) => !isNullish(v))

  if (inferredType === 'number') {
    const nums = nonNull.map(toNumber).filter((n): n is number => n !== null)
    if (!nums.length) return null
    const uniqueCount = new Set(nums.map((n) => n.toFixed(4))).size
    return {
      name,
      type: 'numeric',
      nullCount,
      nullPercent: pct(nullCount, rowCount),
      uniqueCount,
      min: Math.min(...nums),
      max: Math.max(...nums),
      mean: mean(nums),
      median: median(nums),
      stdDev: stdDev(nums),
      sample: nums.slice(0, 5),
    }
  }

  if (inferredType === 'date') {
    const dates = nonNull
      .map((v) => new Date(String(v)))
      .filter((d) => !Number.isNaN(d.getTime()))
    if (!dates.length) return null
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const rangeMonths = Math.max(
      1,
      Math.round((max.getTime() - min.getTime()) / (86400000 * 30))
    )
    return {
      name,
      type: 'date',
      nullCount,
      nullPercent: pct(nullCount, rowCount),
      min: min.toISOString().slice(0, 10),
      max: max.toISOString().slice(0, 10),
      rangeMonths,
      granularity: detectDateGranularity(dates),
    }
  }

  // string, boolean, unknown → categorical
  const counts = new Map<string, number>()
  for (const v of nonNull) {
    const key = String(v).trim().slice(0, 120)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const topValues = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([value, count]) => ({ value, count }))

  return {
    name,
    type: 'categorical',
    nullCount,
    nullPercent: pct(nullCount, rowCount),
    uniqueCount: counts.size,
    topValues,
  }
}

export function buildEnrichedContext(
  schema: DatasetSchema,
  rows: Array<Record<string, unknown>>,
  likelyDatasetType: string
): EnrichedDatasetContext {
  const columnValues = new Map<string, unknown[]>()
  for (const col of schema.columns) {
    columnValues.set(col.name, [])
  }
  for (const row of rows) {
    for (const col of schema.columns) {
      columnValues.get(col.name)!.push(row[col.name])
    }
  }

  const columnStats: ColumnStats[] = []
  const dateColumns: string[] = []
  const numericColumns: string[] = []
  const categoricalColumns: string[] = []

  for (const col of schema.columns) {
    const values = columnValues.get(col.name) ?? []
    const stats = statsForColumn(col.name, col.type, values, schema.rowCount)
    if (!stats) continue
    columnStats.push(stats)
    if (stats.type === 'date') dateColumns.push(col.name)
    else if (stats.type === 'numeric') numericColumns.push(col.name)
    else categoricalColumns.push(col.name)
  }

  return {
    schema,
    columnStats,
    metadata: {
      rowCount: schema.rowCount,
      columnCount: schema.columns.length,
      dateColumns,
      numericColumns,
      categoricalColumns,
      likelyDatasetType,
    },
  }
}
