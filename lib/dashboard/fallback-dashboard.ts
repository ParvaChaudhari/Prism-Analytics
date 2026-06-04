import type { DatasetSchema, ColumnSchema } from '@/lib/parsers/schema'
import { inferStatAggregation, profileColumn } from '@/lib/dashboard/stat-aggregation'
import type { DashboardPayload } from '@/types/dashboard'

function bestNumeric(columns: ColumnSchema[]): ColumnSchema | undefined {
  return columns
    .filter((c) => c.type === 'number')
    .sort((a, b) => (a.uniqueCount ?? 0) - (b.uniqueCount ?? 0))
    .find(Boolean)
}

function bestCategorical(columns: ColumnSchema[], maxUnique = 12): ColumnSchema | undefined {
  return columns
    .filter(
      (c) =>
        c.type === 'string' && (c.uniqueCount ?? 0) >= 2 && (c.uniqueCount ?? 0) <= maxUnique
    )
    .sort((a, b) => (a.uniqueCount ?? 0) - (b.uniqueCount ?? 0))
    .find(Boolean)
}

function bestDateColumn(columns: ColumnSchema[]): ColumnSchema | undefined {
  return columns.find((c) => c.type === 'date')
}

export function fallbackDashboard(
  schema: DatasetSchema,
  rows: Array<Record<string, unknown>> = []
): DashboardPayload {
  const numeric = schema.columns.filter((c) => c.type === 'number')
  const categorical = schema.columns.filter((c) => c.type === 'string')
  const dateCol = bestDateColumn(schema.columns)
  const metricCol = bestNumeric(schema.columns)
  const dimCol = bestCategorical(schema.columns)

  const charts: DashboardPayload['charts'] = []

  charts.push({
    chart_type: 'stat',
    title: 'Total records',
    description: 'Number of rows in your dataset.',
    aggregation: 'count',
  })

  if (metricCol) {
    const profile = profileColumn(rows, metricCol.name)
    const agg = inferStatAggregation(metricCol.name, profile, `Average ${metricCol.name}`)
    const isTotal = agg === 'sum'
    charts.push({
      chart_type: 'stat',
      title: isTotal ? `Total ${metricCol.name}` : `Average ${metricCol.name}`,
      description: isTotal
        ? `Sum of all ${metricCol.name} values.`
        : `Average ${metricCol.name} across all records.`,
      yAxis: metricCol.name,
      aggregation: agg,
    })
  }

  if (dateCol && metricCol) {
    charts.push({
      chart_type: 'line',
      title: `${metricCol.name} over time`,
      description: `How ${metricCol.name} changes over time.`,
      xAxis: dateCol.name,
      yAxis: metricCol.name,
      aggregation: 'sum',
    })
  }

  if (dimCol && metricCol) {
    charts.push({
      chart_type: 'bar',
      title: `${metricCol.name} by ${dimCol.name}`,
      description: `${metricCol.name} broken down by ${dimCol.name}.`,
      xAxis: dimCol.name,
      yAxis: metricCol.name,
      aggregation: 'sum',
    })
  }

  const pieCol = bestCategorical(schema.columns, 6)
  if (pieCol && pieCol.name !== dimCol?.name) {
    charts.push({
      chart_type: 'pie',
      title: `${pieCol.name} breakdown`,
      description: `Distribution of records by ${pieCol.name}.`,
      xAxis: pieCol.name,
      aggregation: 'count',
    })
  }

  return {
    title: 'Data overview',
    ai_summary: `Your dataset contains ${schema.rowCount.toLocaleString()} rows across ${schema.columns.length} columns — including ${numeric.length} numeric and ${categorical.length} text columns${dateCol ? ` with time data in "${dateCol.name}"` : ''}. The charts below highlight the most relevant patterns detected automatically. Use the AI chat or add charts manually to explore further.`,
    ai_insights: [
      {
        title: 'Dataset loaded',
        description: `${schema.rowCount.toLocaleString()} rows ready for analysis.`,
        type: 'positive',
      },
      {
        title: `${numeric.length} numeric column${numeric.length !== 1 ? 's' : ''} detected`,
        description: numeric.length
          ? `Key metrics: ${numeric.slice(0, 3).map((c) => c.name).join(', ')}.`
          : 'No numeric columns found — charts will show counts.',
        type: numeric.length ? 'neutral' : 'warning',
      },
      ...(dateCol
        ? [
            {
              title: 'Time data detected',
              description: `"${dateCol.name}" can be used for trend analysis.`,
              type: 'positive' as const,
            },
          ]
        : []),
    ],
    charts,
  }
}
