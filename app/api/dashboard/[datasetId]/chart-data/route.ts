import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildChartSeries } from '@/lib/dashboard/chart-data'
import {
  fetchCharts,
  getDashboardByDatasetId,
  loadDatasetRows,
} from '@/lib/dashboard/dashboard-db'
import type { ChartConfig, ChartType } from '@/types/dashboard'

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

  const chartData: Record<string, Array<Record<string, string | number>>> = {}

  for (const chart of charts) {
    const config = chart.config as ChartConfig
    chartData[chart.id as string] = buildChartSeries(
      rows,
      chart.chart_type as ChartType,
      config
    )
  }

  return NextResponse.json({
    chartData,
    columns: result.columns,
  })
}
