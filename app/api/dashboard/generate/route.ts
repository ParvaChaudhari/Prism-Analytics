import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSchemaFromRows } from '@/lib/parsers/schema'
import { generateAiPayload } from '@/lib/dashboard/generate-ai-payload'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardPayload } from '@/types/dashboard'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_CLIENT_ROWS = 2000

type Body = { datasetId: string; regenerate?: boolean }

async function fetchCharts(admin: SupabaseClient, dashboardId: string) {
  const { data: charts } = await admin
    .from('charts')
    .select('id, title, chart_type, config, position, is_manual')
    .eq('dashboard_id', dashboardId)
    .order('created_at', { ascending: true })
  return charts ?? []
}

async function insertAiCharts(
  admin: SupabaseClient,
  dashboardId: string,
  userId: string,
  payload: DashboardPayload,
  startIndex: number
) {
  const chartRows = payload.charts.map((chart, idx) => ({
    dashboard_id: dashboardId,
    user_id: userId,
    title: chart.title,
    chart_type: chart.chart_type,
    config: {
      xAxis: chart.xAxis,
      yAxis: chart.yAxis,
      groupBy: chart.groupBy,
      aggregation: chart.aggregation ?? 'sum',
      description: chart.description,
    },
    is_manual: false,
    position: {
      x: (startIndex + idx) % 2,
      y: Math.floor((startIndex + idx) / 2),
      w: 1,
      h: 1,
    },
  }))

  if (!chartRows.length) return []

  const { data: charts, error } = await admin
    .from('charts')
    .insert(chartRows)
    .select('id, title, chart_type, config, position, is_manual')

  if (error) throw new Error(error.message)
  return charts ?? []
}

export async function POST(request: Request) {
  try {
    const supabase = await createUserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: Body
    try {
      body = (await request.json()) as Body
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.datasetId) {
      return NextResponse.json({ error: 'Missing datasetId' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: dataset, error: datasetError } = await admin
      .from('datasets')
      .select('id, user_id, cleaned_data, raw_schema')
      .eq('id', body.datasetId)
      .eq('user_id', user.id)
      .single()

    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    const rows = (dataset.cleaned_data as Array<Record<string, unknown>>) ?? []
    const schema =
      (dataset.raw_schema as ReturnType<typeof buildSchemaFromRows>) ??
      buildSchemaFromRows(rows)

    const { data: existing } = await admin
      .from('dashboards')
      .select('id, title, ai_summary, ai_insights, dataset_id')
      .eq('dataset_id', dataset.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing && body.regenerate) {
      await admin.from('charts').delete().eq('dashboard_id', existing.id).eq('is_manual', false)

      const payload = await generateAiPayload(schema, rows)

      const { data: dashboard, error: updateError } = await admin
        .from('dashboards')
        .update({
          title: payload.title,
          ai_summary: payload.ai_summary,
          ai_insights: payload.ai_insights,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, title, ai_summary, ai_insights, dataset_id')
        .single()

      if (updateError || !dashboard) {
        return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 })
      }

      const { count } = await admin
        .from('charts')
        .select('id', { count: 'exact', head: true })
        .eq('dashboard_id', existing.id)

      await insertAiCharts(admin, existing.id, user.id, payload, count ?? 0)
      const charts = await fetchCharts(admin, existing.id)

      return NextResponse.json({
        dashboard,
        charts,
        rows: rows.slice(0, MAX_CLIENT_ROWS),
      })
    }

    if (existing) {
      const charts = await fetchCharts(admin, existing.id)
      return NextResponse.json({
        dashboard: existing,
        charts,
        rows: rows.slice(0, MAX_CLIENT_ROWS),
      })
    }

    const payload = await generateAiPayload(schema, rows)

    const { data: dashboard, error: dashError } = await admin
      .from('dashboards')
      .insert({
        dataset_id: dataset.id,
        user_id: user.id,
        title: payload.title,
        ai_summary: payload.ai_summary,
        ai_insights: payload.ai_insights,
        layout: { columns: 2 },
      })
      .select('id, title, ai_summary, ai_insights, dataset_id')
      .single()

    if (dashError || !dashboard) {
      return NextResponse.json({ error: 'Failed to save dashboard' }, { status: 500 })
    }

    const charts = await insertAiCharts(admin, dashboard.id, user.id, payload, 0)

    return NextResponse.json({
      dashboard,
      charts,
      rows: rows.slice(0, MAX_CLIENT_ROWS),
    })
  } catch (err) {
    console.error('Dashboard generate error:', err)
    const message = err instanceof Error ? err.message : 'Dashboard generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
