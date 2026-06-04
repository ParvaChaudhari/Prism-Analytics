import type { ColumnSchema } from '@/lib/parsers/schema'
import type { GeneratedChart } from '@/types/dashboard'

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.trim().replace(/[,$%]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

export type ColumnNumericProfile = {
  min: number
  max: number
  mean: number
  count: number
}

export function profileColumn(
  rows: Array<Record<string, unknown>>,
  columnName: string
): ColumnNumericProfile | null {
  const nums = rows
    .map((r) => toNumber(r[columnName]))
    .filter((n): n is number => n !== null)
  if (!nums.length) return null
  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
    mean: nums.reduce((a, b) => a + b, 0) / nums.length,
    count: nums.length,
  }
}

const AVG_NAME =
  /risk|score|rate|percent|pct|ratio|index|growth|satisfaction|performance|probability|replacement|demand|margin|yield|conversion|ctr|roas|share/i

const SUM_NAME =
  /salary|revenue|quantity|amount|spend|cost|price|income|wage|pay|sales|orders|qty|volume|headcount|employees|units/i

/** Infer how a stat card should aggregate a numeric column. */
export function inferStatAggregation(
  columnName: string,
  profile: ColumnNumericProfile | null,
  chartTitle = ''
): 'avg' | 'sum' | 'count' {
  const label = `${columnName} ${chartTitle}`.toLowerCase()

  if (/average|avg\.|mean|median/.test(label)) return 'avg'

  if (!profile) return 'count'

  // 0–1 scores (e.g. AI replacement risk)
  if (profile.max <= 1 && profile.min >= 0) return 'avg'

  // 0–100 rates / percentages (e.g. job growth %)
  if (profile.max <= 100 && profile.min >= 0) {
    if (AVG_NAME.test(label)) return 'avg'
    if (/%|percent|pct|rate|score|risk|growth/.test(label)) return 'avg'
    if (profile.mean <= 100 && !SUM_NAME.test(label)) return 'avg'
  }

  if (AVG_NAME.test(label) && profile.max <= 1000) return 'avg'

  if (SUM_NAME.test(label) && profile.max > 100) {
    if (/total|sum/.test(label) && !/average|avg|mean/.test(label)) return 'sum'
    if (/salary|revenue|spend|quantity|amount|cost|price|income/.test(label)) {
      return /average|avg|mean/.test(label) ? 'avg' : 'sum'
    }
  }

  if (profile.max > 10_000 && SUM_NAME.test(label)) return 'sum'

  return 'avg'
}

/** Correct stat card aggregations after AI or fallback generation. */
export function fixStatChartAggregations(
  charts: GeneratedChart[],
  columns: ColumnSchema[],
  rows: Array<Record<string, unknown>>
): GeneratedChart[] {
  const colMap = new Map(columns.map((c) => [c.name, c]))

  return charts.map((chart) => {
    if (chart.chart_type !== 'stat') return chart

    if (!chart.yAxis || !colMap.has(chart.yAxis)) {
      return { ...chart, aggregation: 'count' as const }
    }

    const col = colMap.get(chart.yAxis)!

    // Use runtime profile when available, but prefer schema min/max if present
    const runtimeProfile = profileColumn(rows, chart.yAxis)
    let profile = runtimeProfile
    if (!profile && typeof col.max === 'number' && typeof col.min === 'number') {
      profile = { min: col.min, max: col.max, mean: (col.min + col.max) / 2, count: 0 }
    } else if (profile && typeof col.max === 'number') {
      profile.max = col.max
    } else if (profile && typeof col.min === 'number') {
      profile.min = col.min
    }

    let aggregation = inferStatAggregation(chart.yAxis, profile, chart.title)

    // Hard rule: 0–1 scale columns must never sum on stat cards
    if (profile && profile.max <= 1 && profile.min >= 0) {
      aggregation = 'avg'
    }

    return { ...chart, aggregation }
  })
}
