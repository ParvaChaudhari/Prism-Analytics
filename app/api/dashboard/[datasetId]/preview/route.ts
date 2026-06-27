import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadDatasetRows } from '@/lib/dashboard/dashboard-db'
import { buildChartSeries } from '@/lib/dashboard/chart-data'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ChartConfig, ChartType } from '@/types/dashboard'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { datasetId } = await params
    const user = userData.user

    const body = await request.json()
    const { config, chartType, columns } = body as {
      config: ChartConfig
      chartType: ChartType
      columns: string[]
    }

    if (!config || !chartType) {
      return NextResponse.json({ error: 'Missing config or chartType' }, { status: 400 })
    }

    const admin = createAdminClient()
    const rows = await loadDatasetRows(admin, datasetId, user.id)

    if (!rows.length) {
      return NextResponse.json({ data: [] })
    }

    const previewData = buildChartSeries(rows, chartType, config, columns)

    return NextResponse.json({ data: previewData })
  } catch (error) {
    console.error('POST /api/dashboard/[datasetId]/preview error:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}
