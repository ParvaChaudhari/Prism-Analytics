import type { SupabaseClient } from '@supabase/supabase-js'

export async function getDashboardForDataset(
  admin: SupabaseClient,
  datasetId: string,
  userId: string
) {
  const { data: dataset, error: datasetError } = await admin
    .from('datasets')
    .select('id, user_id, cleaned_data, raw_schema')
    .eq('id', datasetId)
    .eq('user_id', userId)
    .single()

  if (datasetError || !dataset) return { error: 'Dataset not found' as const }

  const { data: dashboard, error: dashError } = await admin
    .from('dashboards')
    .select('id, title, ai_summary, ai_insights, dataset_id')
    .eq('dataset_id', dataset.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (dashError || !dashboard) return { error: 'Dashboard not found' as const }

  return { dataset, dashboard }
}
