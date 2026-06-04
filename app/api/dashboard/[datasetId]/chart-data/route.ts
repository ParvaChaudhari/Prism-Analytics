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
import { buildSchemaFromRows } from '@/lib/parsers/schema'
import type { ChartConfig, ChartType } from '@/types/dashboard'
import type { GeneratedChart } from '@/types/dashboard'

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

  const chartData: Record<string, Array<Record<string, string | number>>> = {}

  charts.forEach((chart, idx) => {
    const config = chart.config as ChartConfig
    const fixed = statFixed[idx]
    const effectiveConfig: ChartConfig =
      chart.chart_type === 'stat' && fixed
        ? { ...config, aggregation: fixed.aggregation }
        : config

    chartData[chart.id as string] = buildChartSeries(
      rows,
      chart.chart_type as ChartType,
      effectiveConfig
    )
  })

  return NextResponse.json({
    chartData,
    columns: result.columns,
  })
}
