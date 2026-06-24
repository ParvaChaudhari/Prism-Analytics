import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadDatasetRows } from '@/lib/dashboard/dashboard-db'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  const { datasetId } = await params

  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  
  try {
    const rows = await loadDatasetRows(admin, datasetId, user.id)
    
    // We limit to 5000 rows to ensure browser memory safety, 
    // even though virtualization handles DOM elements efficiently, 
    // a single JSON response > 5000 rows can be heavy to parse.
    const limitedRows = rows.slice(0, 5000)

    // Extract columns from the first row (if rows exist)
    const columns = limitedRows.length > 0 ? Object.keys(limitedRows[0]) : []

    return NextResponse.json({
      rows: limitedRows,
      columns,
    })
  } catch (error: any) {
    console.error('Failed to load raw data:', error)
    return NextResponse.json({ error: error.message || 'Failed to load raw data' }, { status: 500 })
  }
}
