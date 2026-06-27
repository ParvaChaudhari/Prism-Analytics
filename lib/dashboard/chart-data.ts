import type { ChartConfig, ChartType, ChartDataPoint } from '@/types/dashboard'
import { getOrdinalOrder, sortByOrdinal } from '@/lib/dashboard/ordinal-sort'

function toNumber(v: unknown): number | null {
  // Treat nullish and empty-string as missing — never coerce to 0
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const s = v.trim()
    if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'na') return null
    const n = Number(s.replace(/[,$%]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function aggregate(nums: number[], mode: ChartConfig['aggregation']): number {
  if (!nums.length) return 0
  switch (mode) {
    case 'avg':
      return nums.reduce((a, b) => a + b, 0) / nums.length
    case 'count':
      return nums.length
    case 'min':
      return Math.min(...nums)
    case 'max':
      return Math.max(...nums)
    case 'sum':
      return nums.reduce((a, b) => a + b, 0)
    case 'avg':
    default:
      return nums.reduce((a, b) => a + b, 0) / nums.length
  }
}

function excelSerialToISO(serial: number): string | null {
  if (serial < 30000 || serial > 50000) return null
  const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function normalizeDate(v: unknown): string | null {
  if (typeof v === 'number') return excelSerialToISO(v)
  if (typeof v !== 'string') return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function bucketDate(isoDate: string, granularity: string): string {
  if (granularity === 'monthly') return isoDate.slice(0, 7)
  if (granularity === 'yearly') return isoDate.slice(0, 4)
  if (granularity === 'weekly') {
    const d = new Date(isoDate)
    d.setDate(d.getDate() - d.getDay())
    return d.toISOString().slice(0, 10)
  }
  return isoDate
}

function detectGranularity(keys: string[]): string {
  if (keys.length <= 12) return 'monthly'
  if (keys.length <= 52) return 'weekly'
  if (keys.length > 366) return 'monthly'
  return 'daily'
}

function isDateColumn(colName: string, rows: Array<Record<string, unknown>>): boolean {
  const sample = rows.slice(0, 20).map((r) => r[colName])
  const dateCount = sample.filter((v) => normalizeDate(v) !== null).length
  return dateCount >= Math.floor(sample.length * 0.7)
}

export function buildChartSeries(
  rows: Array<Record<string, unknown>>,
  chartType: ChartType,
  config: ChartConfig,
  listColumns: string[] = []
): ChartDataPoint[] {
  let { xAxis, yAxis, groupBy, aggregation = 'sum' } = config

  let processedRows = rows

  if (xAxis && listColumns.includes(xAxis)) {
    processedRows = processedRows.flatMap((row) => {
      const val = row[xAxis]
      if (typeof val !== 'string') return [row]
      const parts = val.split(',').map((s) => s.trim()).filter(Boolean)
      if (parts.length === 0) return [row]
      return parts.map((part) => ({ ...row, [xAxis]: part }))
    })
  }

  if (groupBy && listColumns.includes(groupBy)) {
    processedRows = processedRows.flatMap((row) => {
      const val = row[groupBy!] // groupBy is defined here
      if (typeof val !== 'string') return [row]
      const parts = val.split(',').map((s) => s.trim()).filter(Boolean)
      if (parts.length === 0) return [row]
      return parts.map((part) => ({ ...row, [groupBy!]: part }))
    })
  }

  if (yAxis && aggregation !== 'count') {
    const isNumeric = processedRows.slice(0, 10).some(r => toNumber(r[yAxis]) !== null)
    if (!isNumeric) {
      aggregation = 'count'
    }
  }
  const granularity =
    config.granularity && config.granularity !== 'auto'
      ? config.granularity
      : undefined

  if (chartType === 'stat') {
    if (aggregation === 'count') return [{ name: 'Count', value: processedRows.length }]
    if (yAxis) {
      // toNumber returns null for null/empty/missing values — no zeros will sneak in
      const nums = processedRows
        .map((r) => toNumber(r[yAxis]))
        .filter((n): n is number => n !== null)
      return [{ name: yAxis, value: aggregate(nums, aggregation) }]
    }
    return [{ name: 'Rows', value: processedRows.length }]
  }

  if (chartType === 'scatter' && xAxis && yAxis) {
    return processedRows
      .slice(0, 400)
      .map((r, i) => ({
        name: String(i),
        x: toNumber(r[xAxis]) ?? 0,
        y: toNumber(r[yAxis]) ?? 0,
      }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  }

  if (!xAxis) return []

  const isTimeSeries =
    (chartType === 'line' || chartType === 'area') && isDateColumn(xAxis, processedRows)

  if (isTimeSeries) {
    const rawKeys = processedRows
      .map((r) => normalizeDate(r[xAxis]))
      .filter((d): d is string => d !== null)
    const uniqueRaw = [...new Set(rawKeys)]
    const bucketGranularity = granularity ?? detectGranularity(uniqueRaw)

    if (groupBy) {
      const groups = new Set(processedRows.map((r) => String(r[groupBy] ?? '(empty)')))
      const bucketMap = new Map<string, Map<string, number[]>>()

      for (const row of processedRows) {
        const iso = normalizeDate(row[xAxis])
        if (!iso) continue
        const bucket = bucketDate(iso, bucketGranularity)
        const group = String(row[groupBy] ?? '(empty)')
        if (!bucketMap.has(bucket)) bucketMap.set(bucket, new Map())
        const gMap = bucketMap.get(bucket)!
        if (!gMap.has(group)) gMap.set(group, [])
        if (yAxis) {
          const n = toNumber(row[yAxis])
          if (n !== null) gMap.get(group)!.push(n)
        } else {
          gMap.get(group)!.push(1)
        }
      }

      return Array.from(bucketMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([bucket, gMap]) => {
          const point: ChartDataPoint = { name: bucket }
          for (const g of groups) {
            point[g] = aggregate(gMap.get(g) ?? [], aggregation)
          }
          return point
        })
    }

    const bucketMap = new Map<string, number[]>()
    for (const row of processedRows) {
      const iso = normalizeDate(row[xAxis])
      if (!iso) continue
      const bucket = bucketDate(iso, bucketGranularity)
      if (!bucketMap.has(bucket)) bucketMap.set(bucket, [])
      if (yAxis && aggregation !== 'count' && yAxis !== xAxis) {
        // toNumber returns null for empty/missing — skip those rows cleanly
        const n = toNumber(row[yAxis])
        if (n !== null) bucketMap.get(bucket)!.push(n)
      } else {
        bucketMap.get(bucket)!.push(1)
      }
    }

    return Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, nums]) => ({
        name,
        value: aggregate(nums, aggregation),
      }))
  }

  if (groupBy) {
    const groups = new Set(processedRows.map((r) => String(r[groupBy] ?? '(empty)')))
    const bucketMap = new Map<string, Map<string, number[]>>()

    for (const row of processedRows) {
      const key = String(row[xAxis] ?? '(empty)')
      const group = String(row[groupBy] ?? '(empty)')
      if (!bucketMap.has(key)) bucketMap.set(key, new Map())
      const gMap = bucketMap.get(key)!
      if (!gMap.has(group)) gMap.set(group, [])
      if (yAxis && aggregation !== 'count' && yAxis !== xAxis) {
        const n = toNumber(row[yAxis])
        gMap.get(group)!.push(n !== null ? n : 1)
      } else {
        gMap.get(group)!.push(1)
      }
    }

    const groupedData = Array.from(bucketMap.entries())
      .slice(0, 20)
      .map(([name, gMap]) => {
        const point: ChartDataPoint = {
          name: name.length > 24 ? `${name.slice(0, 24)}…` : name,
        }
        for (const g of groups) {
          point[g] = aggregate(gMap.get(g) ?? [], aggregation)
        }
        return point
      })

    const isOrdinalGroup = getOrdinalOrder(xAxis) !== null
    if (isOrdinalGroup) {
      return sortByOrdinal(groupedData, xAxis)
    }

    return groupedData.sort((a, b) => {
      const aTotal = Object.entries(a)
        .filter(([k]) => k !== 'name')
        .reduce((s, [, v]) => s + (typeof v === 'number' ? v : 0), 0)
      const bTotal = Object.entries(b)
        .filter(([k]) => k !== 'name')
        .reduce((s, [, v]) => s + (typeof v === 'number' ? v : 0), 0)
      return bTotal - aTotal
    })
  }

  const groups = new Map<string, number[]>()
  for (const row of processedRows) {
    const raw = row[xAxis]
    // Skip null/empty values — don't render them as chart categories
    if (raw == null || raw === '' || String(raw).toLowerCase() === 'null') continue
    const key = String(raw)
    if (!groups.has(key)) groups.set(key, [])
    if (yAxis && aggregation !== 'count' && yAxis !== xAxis) {
      // toNumber returns null for empty/missing — skip those rows cleanly
      const n = toNumber(row[yAxis])
      if (n !== null) groups.get(key)!.push(n)
    } else {
      groups.get(key)!.push(1)
    }
  }

  const grouped = Array.from(groups.entries())
    .map(([name, nums]) => ({
      name: name.length > 24 ? `${name.slice(0, 24)}…` : name,
      value: aggregate(nums, aggregation),
    }))

  const ordinalSorted = sortByOrdinal(grouped, xAxis)
  const isOrdinal = getOrdinalOrder(xAxis) !== null

  return (isOrdinal
    ? ordinalSorted
    : grouped.sort((a, b) => (b.value as number) - (a.value as number)))
    .slice(0, chartType === 'bar' ? 10 : 24)
}
