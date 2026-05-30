import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exclude = new URL(request.url).searchParams.get('exclude')

  const admin = createAdminClient()
  let query = admin
    .from('datasets')
    .select('id, row_count, created_at, upload_id, uploads(original_filename)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (exclude) query = query.neq('id', exclude)

  const { data, error } = await query.limit(20)

  if (error) {
    return NextResponse.json({ error: 'Failed to load datasets' }, { status: 500 })
  }

  const datasets = (data ?? []).map((d) => {
    const upload = d.uploads as { original_filename?: string } | null
    return {
      id: d.id,
      row_count: d.row_count,
      created_at: d.created_at,
      name: upload?.original_filename ?? 'Dataset',
    }
  })

  return NextResponse.json({ datasets })
}
