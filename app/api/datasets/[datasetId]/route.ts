import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function DELETE(request: Request, props: { params: Promise<{ datasetId: string }> }) {
  const params = await props.params
  const datasetId = params.datasetId

  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 1. Get the dataset to find the upload_id
  const { data: dataset, error: datasetError } = await admin
    .from('datasets')
    .select('upload_id')
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .single()

  if (datasetError || !dataset) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }

  // 2. Get the upload to find the storage path
  const { data: upload, error: uploadError } = await admin
    .from('uploads')
    .select('id, storage_path')
    .eq('id', dataset.upload_id)
    .single()

  // 3. Delete from Supabase Storage
  if (upload?.storage_path) {
    await admin.storage.from('uploads').remove([upload.storage_path])
  }

  // 4. Delete the upload record (this should cascade and delete the dataset, dashboards, and charts)
  // Just in case it doesn't cascade, we explicitly delete the dataset as well.
  await admin.from('datasets').delete().eq('id', datasetId)
  if (upload?.id) {
    await admin.from('uploads').delete().eq('id', upload.id)
  }

  return NextResponse.json({ success: true })
}
