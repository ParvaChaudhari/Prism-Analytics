import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDashboardByDatasetId } from '@/lib/dashboard/dashboard-db'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const { datasetId } = await params

    const supabase = await createUserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const result = await getDashboardByDatasetId(admin, datasetId, user.id)

    if (!result) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    if (!result.dashboard) {
      return NextResponse.json({ exists: false, columns: result.columns })
    }

    return NextResponse.json({
      exists: true,
      dashboard: result.dashboard,
      charts: result.charts,
      columns: result.columns,
    })
  } catch (err) {
    console.error('GET /api/dashboard/[datasetId] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
