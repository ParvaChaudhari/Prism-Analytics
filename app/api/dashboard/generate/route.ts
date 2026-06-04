import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSchemaFromRows } from '@/lib/parsers/schema'
import { generateAiPayload } from '@/lib/dashboard/generate-ai-payload'
import {
  fetchCharts,
  getDashboardByDatasetId,
  loadDatasetRows,
} from '@/lib/dashboard/dashboard-db'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardPayload } from '@/types/dashboard'
import { inferAggregation } from '@/lib/dashboard/infer-aggregation'

export const runtime = 'nodejs'
export const maxDuration = 60

type Body = { datasetId: string; regenerate?: boolean }

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
      ...(chart.groupBy ? { groupBy: chart.groupBy } : {}),
      aggregation: chart.aggregation ?? 'sum',
      ...(chart.granularity ? { granularity: chart.granularity } : {}),
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
    const existing = await getDashboardByDatasetId(admin, body.datasetId, user.id)

    if (!existing) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    if (existing.dashboard && !body.regenerate) {
      return NextResponse.json(
        { error: 'Dashboard already exists', exists: true },
        { status: 409 }
      )
    }

    const rows = await loadDatasetRows(admin, body.datasetId, user.id)
    const schema =
      (existing.dataset.raw_schema as ReturnType<typeof buildSchemaFromRows>) ??
      buildSchemaFromRows(rows)

    const { data: upload } = await admin
      .from('uploads')
      .select('computed_stats')
      .eq('id', (existing.dataset as any).upload_id)
      .single()
    const computedStats = upload?.computed_stats

    const processPayload = (payload: DashboardPayload) => {
      payload.charts = payload.charts.map((chart) => {
        if (!chart.yAxis) return chart
        const yCol = computedStats?.columns?.find((c: any) => c.name === chart.yAxis)
        return {
          ...chart,
          aggregation: inferAggregation(chart.yAxis, yCol?.max, yCol?.min)
        }
      })
      const statCards = payload.charts.filter(c => c.chart_type === 'stat').slice(0, 3)
      const otherCharts = payload.charts.filter(c => c.chart_type !== 'stat').slice(0, 4)
      payload.charts = [...statCards, ...otherCharts]
      return payload
    }

    if (existing.dashboard && body.regenerate) {
      await admin
        .from('charts')
        .delete()
        .eq('dashboard_id', existing.dashboard.id)
        .eq('is_manual', false)

      let payload = await generateAiPayload(schema, rows, user.id, computedStats)
      payload = processPayload(payload)

      const { data: dashboard, error: updateError } = await admin
        .from('dashboards')
        .update({
          title: payload.title,
          ai_summary: payload.ai_summary,
          ai_insights: payload.ai_insights,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.dashboard.id)
        .select('id, title, ai_summary, ai_insights, dataset_id')
        .single()

      if (updateError || !dashboard) {
        return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 })
      }

      const { count } = await admin
        .from('charts')
        .select('id', { count: 'exact', head: true })
        .eq('dashboard_id', existing.dashboard.id)

      await insertAiCharts(admin, existing.dashboard.id, user.id, payload, count ?? 0)
      const charts = await fetchCharts(admin, existing.dashboard.id)

      return NextResponse.json({
        dashboard,
        charts,
        columns: existing.columns,
        aiNotice: payload.aiNotice,
      })
    }

    let payload = await generateAiPayload(schema, rows, user.id, computedStats)
    payload = processPayload(payload)

    const { data: dashboard, error: dashError } = await admin
      .from('dashboards')
      .insert({
        dataset_id: existing.dataset.id,
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
      columns: existing.columns.length ? existing.columns : schema.columns.map((c) => c.name),
      aiNotice: payload.aiNotice,
    })
  } catch (err) {
    console.error('Dashboard generate error:', err)
    const message = err instanceof Error ? err.message : 'Dashboard generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
