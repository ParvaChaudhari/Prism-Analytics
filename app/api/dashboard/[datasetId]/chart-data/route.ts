import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildChartSeries } from '@/lib/dashboard/chart-data'
import {
  fetchCharts,
  getDashboardByDatasetId,
  loadDatasetRows,
} from '@/lib/dashboard/dashboard-db'
import { fixStatChartAggregations } from '@/lib/dashboard/stat-aggregation'
import { inferAggregation } from '@/lib/dashboard/infer-aggregation'
import { buildSchemaFromRows } from '@/lib/parsers/schema'
import type { ChartConfig, ChartType, ChartDataPoint, GeneratedChart } from '@/types/dashboard'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  const { datasetId } = await params

  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const result = await getDashboardByDatasetId(admin, datasetId, user.id)

  if (!result?.dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  const charts = result.charts.length
    ? result.charts
    : await fetchCharts(admin, result.dashboard.id)

  const rows = await loadDatasetRows(admin, datasetId, user.id)
  const schema = buildSchemaFromRows(rows)

  const statFixed = fixStatChartAggregations(
    charts.map((c) => {
      const config = c.config as ChartConfig
      return {
        chart_type: c.chart_type as GeneratedChart['chart_type'],
        title: c.title as string,
        description: config.description ?? '',
        xAxis: config.xAxis,
        yAxis: config.yAxis,
        aggregation: config.aggregation,
      }
    }),
    schema.columns,
    rows
  )

  const chartData: Record<string, ChartDataPoint[]> = {}
  const listColumns = schema.columns.filter(c => c.type === 'list').map(c => c.name)

  charts.forEach((chart, idx) => {
    const config = chart.config as ChartConfig
    const fixed = statFixed[idx]

    // For stat charts: use the runtime-corrected aggregation from fixStatChartAggregations
    // For all other charts: re-infer aggregation from the column name at render time.
    // This corrects charts that were stored in the DB with a wrong 'sum' aggregation.
    let effectiveAggregation = config.aggregation
    if (chart.chart_type === 'stat' && fixed) {
      effectiveAggregation = fixed.aggregation
    } else if (chart.chart_type !== 'stat' && config.yAxis) {
      // Re-infer so stored 'sum' on avg-type columns (BMI, calories, etc.) gets corrected
      effectiveAggregation = inferAggregation(config.yAxis)
    }

    const effectiveConfig: ChartConfig = { ...config, aggregation: effectiveAggregation }

    chartData[chart.id as string] = buildChartSeries(
      rows,
      chart.chart_type as ChartType,
      effectiveConfig,
      listColumns
    )
  })

  return NextResponse.json({
    chartData,
    columns: result.columns,
  })
}
