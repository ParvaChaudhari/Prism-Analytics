import type { SupabaseClient } from '@supabase/supabase-js'
import { buildSchemaFromRows } from '@/lib/parsers/schema'

export async function fetchCharts(admin: SupabaseClient, dashboardId: string) {
  const { data: charts } = await admin
    .from('charts')
    .select('id, title, chart_type, config, position, is_manual')
    .eq('dashboard_id', dashboardId)
    .order('created_at', { ascending: true })
  return charts ?? []
}

export async function getDashboardByDatasetId(
  admin: SupabaseClient,
  datasetId: string,
  userId: string
) {
  const { data: dataset, error: datasetError } = await admin
    .from('datasets')
    .select('id, upload_id, raw_schema')
    .eq('id', datasetId)
    .eq('user_id', userId)
    .single()

  if (datasetError || !dataset) return null

  const { data: dashboard, error: dashError } = await admin
    .from('dashboards')
    .select('id, title, ai_summary, ai_insights, dataset_id')
    .eq('dataset_id', dataset.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (dashError || !dashboard) return { dataset, dashboard: null, columns: columnsFromSchema(dataset.raw_schema), schema: schemaFromRaw(dataset.raw_schema) }

  const charts = await fetchCharts(admin, dashboard.id)

  return {
    dataset,
    dashboard,
    charts,
    columns: columnsFromSchema(dataset.raw_schema),
    schema: schemaFromRaw(dataset.raw_schema),
  }
}

export function schemaFromRaw(rawSchema: unknown): Array<{ name: string; type: string }> {
  const schema =
    rawSchema && typeof rawSchema === 'object' && 'columns' in (rawSchema as object)
      ? (rawSchema as ReturnType<typeof buildSchemaFromRows>)
      : null
  return schema?.columns ?? []
}

export function columnsFromSchema(rawSchema: unknown): string[] {
  const schema =
    rawSchema && typeof rawSchema === 'object' && 'columns' in (rawSchema as object)
      ? (rawSchema as ReturnType<typeof buildSchemaFromRows>)
      : null
  return schema?.columns?.map((c) => c.name) ?? []
}

export async function loadDatasetRows(
  admin: SupabaseClient,
  datasetId: string,
  userId: string
) {
  const { data, error } = await admin
    .from('datasets')
    .select('cleaned_data')
    .eq('id', datasetId)
    .eq('user_id', userId)
    .single()

  if (error || !data) return []
  return (data.cleaned_data as Array<Record<string, unknown>>) ?? []
}
