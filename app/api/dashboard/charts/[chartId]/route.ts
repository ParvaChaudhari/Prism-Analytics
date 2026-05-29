import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type PatchBody = {
  title?: string
  config?: Record<string, unknown>
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chartId: string }> }
) {
  const { chartId } = await params
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as PatchBody
  const updates: Record<string, unknown> = {}
  if (body.title) updates.title = body.title
  if (body.config) updates.config = body.config

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: chart, error } = await admin
    .from('charts')
    .update(updates)
    .eq('id', chartId)
    .eq('user_id', user.id)
    .select('id, title, chart_type, config, position')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update chart' }, { status: 500 })
  }

  return NextResponse.json({ chart })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ chartId: string }> }
) {
  const { chartId } = await params
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin.from('charts').delete().eq('id', chartId).eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete chart' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
