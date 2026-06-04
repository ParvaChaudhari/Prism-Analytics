import type { GeneratedChart } from '@/types/dashboard'
import type { ColumnSchema } from '@/lib/parsers/schema'
import { fixStatChartAggregations } from '@/lib/dashboard/stat-aggregation'

export function fixAggregations(
  charts: GeneratedChart[],
  columns: ColumnSchema[],
  rows: Array<Record<string, unknown>>
): GeneratedChart[] {
  return fixStatChartAggregations(charts, columns, rows)
}
