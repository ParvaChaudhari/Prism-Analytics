import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDashboardForDataset } from '@/lib/dashboard/get-dashboard'
import type { ChartConfig, ChartType } from '@/types/dashboard'

export const runtime = 'nodejs'

type Body = {
  datasetId: string
  title: string
  chart_type: ChartType
  config: ChartConfig
}

export async function POST(request: Request) {
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as Body
  if (!body.datasetId || !body.title || !body.chart_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()
  const result = await getDashboardForDataset(admin, body.datasetId, user.id)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  const { count } = await admin
    .from('charts')
    .select('id', { count: 'exact', head: true })
    .eq('dashboard_id', result.dashboard.id)

  const idx = count ?? 0

  const { data: chart, error } = await admin
    .from('charts')
    .insert({
      dashboard_id: result.dashboard.id,
      user_id: user.id,
      title: body.title,
      chart_type: body.chart_type,
      config: body.config,
      is_manual: true,
      position: { x: idx % 2, y: Math.floor(idx / 2), w: 1, h: 1 },
    })
    .select('id, title, chart_type, config, position')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create chart' }, { status: 500 })
  }

  return NextResponse.json({ chart })
}
