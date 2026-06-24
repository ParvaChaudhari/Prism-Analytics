import type { GeneratedChart } from '@/types/dashboard'
import type { ColumnSchema } from '@/lib/parsers/schema'

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.trim().replace(/[,$%]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Detect whether a bar/pie chart would appear "flat" — all category values
 * are so similar that the chart communicates no useful insight.
 *
 * Uses coefficient of variation (CV = stddev / mean). If CV < threshold,
 * the bars will all look the same height.
 */
export function detectFlatChart(
  chart: GeneratedChart,
  rows: Array<Record<string, unknown>>,
  columns: ColumnSchema[],
  cvThreshold = 0.05
): { isFlat: boolean; cv: number } {
  // Only check bar and pie charts
  if (chart.chart_type !== 'bar' && chart.chart_type !== 'pie') {
    return { isFlat: false, cv: 1 }
  }

  if (!chart.xAxis || !chart.yAxis) {
    return { isFlat: false, cv: 1 }
  }

  const colMap = new Map(columns.map((c) => [c.name, c]))
  const xCol = colMap.get(chart.xAxis)
  if (!xCol || xCol.type !== 'string') {
    return { isFlat: false, cv: 1 }
  }

  // Group rows by xAxis category and compute aggregated value per group
  const groups = new Map<string, number[]>()
  for (const row of rows) {
    const key = String(row[chart.xAxis] ?? '(empty)')
    const val = toNumber(row[chart.yAxis])
    if (val === null) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(val)
  }

  if (groups.size < 2) return { isFlat: false, cv: 1 }

  // Compute the aggregated value for each category
  const agg = chart.aggregation ?? 'avg'
  const categoryValues: number[] = []
  for (const nums of groups.values()) {
    if (!nums.length) continue
    let val: number
    switch (agg) {
      case 'avg':
        val = nums.reduce((a, b) => a + b, 0) / nums.length
        break
      case 'sum':
        val = nums.reduce((a, b) => a + b, 0)
        break
      case 'count':
        val = nums.length
        break
      default:
        val = nums.reduce((a, b) => a + b, 0) / nums.length
    }
    categoryValues.push(val)
  }

  if (categoryValues.length < 2) return { isFlat: false, cv: 1 }

  const mean = categoryValues.reduce((a, b) => a + b, 0) / categoryValues.length
  if (mean === 0) return { isFlat: false, cv: 0 }

  const variance =
    categoryValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / categoryValues.length
  const stddev = Math.sqrt(variance)
  const cv = stddev / Math.abs(mean)

  return { isFlat: cv < cvThreshold, cv }
}

/**
 * Filter out flat charts from a list of generated charts.
 * Returns the charts that are NOT flat.
 */
export function removeFlatCharts(
  charts: GeneratedChart[],
  rows: Array<Record<string, unknown>>,
  columns: ColumnSchema[],
  cvThreshold = 0.05
): GeneratedChart[] {
  return charts.filter((chart) => {
    // Always keep stat/line/area/scatter charts
    if (chart.chart_type !== 'bar' && chart.chart_type !== 'pie') return true

    const { isFlat } = detectFlatChart(chart, rows, columns, cvThreshold)
    if (isFlat) {
      console.log(
        `[chart-quality] Dropping flat chart: "${chart.title}" (${chart.xAxis} × ${chart.yAxis})`
      )
    }
    return !isFlat
  })
}
