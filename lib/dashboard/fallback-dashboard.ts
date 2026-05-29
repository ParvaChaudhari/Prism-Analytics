import type { DatasetSchema } from '@/lib/parsers/schema'
import type { DashboardPayload } from '@/types/dashboard'

export function fallbackDashboard(schema: DatasetSchema): DashboardPayload {
  const numeric = schema.columns.filter((c) => c.type === 'number')
  const categorical = schema.columns.filter((c) => c.type === 'string')

  const charts: DashboardPayload['charts'] = [
    {
      chart_type: 'stat',
      title: 'Total rows',
      description: 'Number of records in your dataset.',
      aggregation: 'count',
    },
  ]

  if (numeric[0]) {
    charts.push({
      chart_type: 'bar',
      title: `${numeric[0].name} distribution`,
      description: `How ${numeric[0].name} varies across the dataset.`,
      xAxis: categorical[0]?.name ?? schema.columns[0]?.name,
      yAxis: numeric[0].name,
      aggregation: 'sum',
    })
  }

  if (categorical[0] && categorical[0].uniqueCount <= 20) {
    charts.push({
      chart_type: 'pie',
      title: `${categorical[0].name} breakdown`,
      description: `Share of records by ${categorical[0].name}.`,
      xAxis: categorical[0].name,
      aggregation: 'count',
    })
  }

  return {
    title: 'Data overview',
    ai_summary: `Your dataset has ${schema.rowCount} rows and ${schema.columns.length} columns. Review the charts below for a quick overview of patterns and distributions.`,
    ai_insights: [
      {
        title: 'Dataset loaded',
        description: `${schema.rowCount} rows ready for analysis.`,
        type: 'positive',
      },
      {
        title: 'Columns detected',
        description: `${numeric.length} numeric and ${categorical.length} text columns.`,
        type: 'neutral',
      },
    ],
    charts,
  }
}
