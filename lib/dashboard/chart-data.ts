import type { ChartConfig, ChartType } from '@/types/dashboard'

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function aggregate(nums: number[], mode: ChartConfig['aggregation']) {
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
    default:
      return nums.reduce((a, b) => a + b, 0)
  }
}

export function buildChartSeries(
  rows: Array<Record<string, unknown>>,
  chartType: ChartType,
  config: ChartConfig
): Array<Record<string, string | number>> {
  const { xAxis, yAxis, aggregation = 'sum' } = config

  if (chartType === 'stat') {
    if (yAxis) {
      const nums = rows.map((r) => toNumber(r[yAxis])).filter((n): n is number => n !== null)
      const value =
        aggregation === 'count' ? rows.length : aggregate(nums.length ? nums : [rows.length], aggregation)
      return [{ name: yAxis, value }]
    }
    return [{ name: 'Rows', value: rows.length }]
  }

  if (chartType === 'scatter' && xAxis && yAxis) {
    return rows
      .slice(0, 400)
      .map((r, i) => ({
        name: String(i),
        x: toNumber(r[xAxis]) ?? 0,
        y: toNumber(r[yAxis]) ?? 0,
      }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  }

  if (!xAxis) return []

  const groups = new Map<string, number[]>()
  for (const row of rows) {
    const key = String(row[xAxis] ?? '(empty)')
    if (!groups.has(key)) groups.set(key, [])
    if (yAxis) {
      const n = toNumber(row[yAxis])
      if (n !== null) groups.get(key)!.push(n)
    } else {
      groups.get(key)!.push(1)
    }
  }

  return Array.from(groups.entries())
    .map(([name, nums]) => ({
      name: name.length > 24 ? `${name.slice(0, 24)}…` : name,
      value: aggregate(nums, yAxis ? aggregation : 'count'),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 24)
}
