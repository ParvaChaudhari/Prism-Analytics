import type { GeneratedChart } from '@/types/dashboard'
import type { ColumnSchema } from '@/lib/parsers/schema'

const VALID_TYPES = new Set(['bar', 'line', 'area', 'pie', 'scatter', 'stat'])
const NUMERIC_TYPES = new Set(['number'])
const DATE_TYPES = new Set(['date'])

export function validateChart(
  chart: GeneratedChart,
  columns: ColumnSchema[],
  rows: Array<Record<string, unknown>> = [],
  rowCount?: number
): GeneratedChart | null {
  const colMap = new Map(columns.map((c) => [c.name, c]))

  if (!VALID_TYPES.has(chart.chart_type)) return null

  if (chart.xAxis && !colMap.has(chart.xAxis)) return null
  if (chart.yAxis && !colMap.has(chart.yAxis)) return null
  if (chart.groupBy && !colMap.has(chart.groupBy)) return null

  const xCol = chart.xAxis ? colMap.get(chart.xAxis) : undefined
  const yCol = chart.yAxis ? colMap.get(chart.yAxis) : undefined

  // Drop charts that group by list-format columns (e.g. "['Drama', 'Fantasy']")
  // Even a single bracketed string in the sample is definitive proof the column is list-formatted
  if (xCol && xCol.type === 'string' && xCol.sample) {
    const hasListFormat = xCol.sample.some((v: any) =>
      typeof v === 'string' && v.trim().startsWith('[')
    )
    if (hasListFormat) {
      return null
    }
  }

  if (['bar', 'line', 'area', 'scatter'].includes(chart.chart_type)) {
    if (!yCol || !NUMERIC_TYPES.has(yCol.type)) return null
  }

  if (['line', 'area'].includes(chart.chart_type) && xCol) {
    const isDate = DATE_TYPES.has(xCol.type)
    const looksLikeDate =
      xCol.uniqueCount > 10 &&
      xCol.sample?.some(
        (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v as string))
      )
    if (!isDate && !looksLikeDate) return null
  }

  if (chart.chart_type === 'scatter') {
    if (!xCol || !NUMERIC_TYPES.has(xCol.type)) return null
  }

  if (chart.chart_type === 'pie' && xCol) {
    if (xCol.uniqueCount > 8) return null
    const extendedXCol = xCol as any
    if (extendedXCol.topValues && Array.isArray(extendedXCol.topValues)) {
      const minShare = Math.min(...extendedXCol.topValues.map((v: any) => parseFloat(v.percent || '0')))
      if (minShare < 3) return { ...chart, chart_type: 'bar' }
    }
  }

  if (chart.chart_type === 'bar' && xCol) {
    const totalRows = rowCount ?? rows.length
    if (totalRows > 0 && xCol.uniqueCount > 50 && xCol.uniqueCount > totalRows * 0.8) {
      return null
    }
  }

  return chart
}

export function dedupeCharts(charts: GeneratedChart[]): GeneratedChart[] {
  const seen = new Set<string>()
  return charts.filter((chart) => {
    const key = `${chart.chart_type}:${chart.xAxis ?? ''}:${chart.yAxis ?? ''}:${chart.groupBy ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function dropEmptyCharts(
  charts: GeneratedChart[],
  columns: ColumnSchema[]
): GeneratedChart[] {
  const colMap = new Map(columns.map((c) => [c.name, c]))
  return charts.filter((chart) => {
    if (chart.chart_type === 'stat') return true
    const xCol = chart.xAxis ? colMap.get(chart.xAxis) : undefined
    if (xCol && xCol.uniqueCount < 2) return false
    return true
  })
}
