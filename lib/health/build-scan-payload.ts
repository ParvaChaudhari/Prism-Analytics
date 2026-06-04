import type { ColumnSchema } from '@/lib/parsers/schema'

function safeNumericStats(values: unknown[]) {
  try {
    const nums = values.map(Number).filter(Number.isFinite)
    if (nums.length === 0) return {
      min: null, max: null, mean: null, median: null,
      stdDev: null, sum: null, invalidCount: values.length,
      warning: 'No valid numeric values found'
    }
    const sorted = [...nums].sort((a, b) => a - b)
    const sum = nums.reduce((a, b) => a + b, 0)
    const mean = sum / nums.length
    let stdDev: number | null = null
    try {
      const variance = nums.reduce((a, n) => a + Math.pow(n - mean, 2), 0) / nums.length
      stdDev = Number.isFinite(variance) ? parseFloat(Math.sqrt(variance).toFixed(4)) : null
    } catch { stdDev = null }
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: Number.isFinite(mean) ? parseFloat(mean.toFixed(4)) : null,
      median: parseFloat(sorted[Math.floor(sorted.length / 2)].toFixed(4)),
      stdDev,
      sum: parseFloat(sum.toFixed(2)),
      invalidCount: values.length - nums.length,
      warning: values.length - nums.length > 0
        ? `${values.length - nums.length} non-numeric values ignored` : null
    }
  } catch {
    return {
      min: null, max: null, mean: null, median: null,
      stdDev: null, sum: null, invalidCount: values.length,
      warning: 'Failed to compute stats'
    }
  }
}

function safeCategoricalStats(values: unknown[], rowCount: number) {
  try {
    const freq = new Map<string, number>()
    for (const v of values) {
      const key = String(v ?? '(empty)')
      freq.set(key, (freq.get(key) ?? 0) + 1)
    }
    return {
      uniqueCount: freq.size,
      topValues: [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([value, count]) => ({
          value, count,
          percent: `${((count / rowCount) * 100).toFixed(1)}%`
        }))
    }
  } catch {
    return { uniqueCount: null, topValues: [], warning: 'Failed to compute category stats' }
  }
}

function safeDateStats(values: unknown[]) {
  try {
    const dates = values
      .map((v) => new Date(v as string))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    if (dates.length === 0) return { earliest: null, latest: null, warning: 'No valid dates found' }
    return {
      earliest: dates[0].toISOString().slice(0, 10),
      latest: dates[dates.length - 1].toISOString().slice(0, 10),
      validCount: dates.length,
      invalidCount: values.length - dates.length
    }
  } catch {
    return { earliest: null, latest: null, warning: 'Failed to parse dates' }
  }
}

export function buildScanPayload(
  rows: Array<Record<string, unknown>>,
  columns: ColumnSchema[]
) {
  const result = {
    rowCount: rows.length,
    columns: [] as unknown[],
    buildErrors: [] as string[]
  }

  for (const col of columns) {
    try {
      const values = rows
        .map((r) => r[col.name])
        .filter((v) => v != null && v !== '')

      const base = {
        name: col.name,
        type: col.type,
        nullCount: rows.length - values.length,
        nullPercent: `${(((rows.length - values.length) / rows.length) * 100).toFixed(1)}%`,
        sample: values.slice(0, 5),
      }

      if (col.type === 'number') {
        result.columns.push({ ...base, ...safeNumericStats(values) })
        continue
      }
      if (col.type === 'date') {
        result.columns.push({ ...base, ...safeDateStats(values) })
        continue
      }
      result.columns.push({ ...base, ...safeCategoricalStats(values, rows.length) })

    } catch {
      result.buildErrors.push(col.name)
      result.columns.push({
        name: col.name, type: col.type,
        nullCount: null,
        warning: 'Could not compute stats for this column'
      })
    }
  }

  return result
}
