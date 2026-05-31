import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DashboardPreviewCard } from '@/components/dashboard/DashboardPreviewCard'
import { createClient } from '@/lib/supabase/server'

type DashboardRow = {
  id: string
  title: string | null
  dataset_id: string
  created_at: string
  datasets: {
    row_count: number | null
    uploads: { original_filename: string | null } | null
  } | null
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: dashboards } = await supabase
    .from('dashboards')
    .select(
      `
      id,
      title,
      dataset_id,
      created_at,
      datasets (
        row_count,
        uploads ( original_filename )
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(12)

  const items = (dashboards ?? []) as DashboardRow[]

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Dashboards</h2>
          <p className="text-text-secondary">
            {user?.email ? `Welcome back, ${user.email}` : 'Welcome back'}
          </p>
        </div>
        <Link href="/upload">
          <Button>New upload</Button>
        </Link>
      </div>

      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => {
            const filename = d.datasets?.uploads?.original_filename ?? 'Dataset'
            const rowCount = d.datasets?.row_count ?? 0
            return (
              <Link key={d.id} href={`/dashboard/${d.dataset_id}`}>
                <Card className="p-4 hover:bg-surface transition-colors flex flex-col gap-3 h-full">
                  <DashboardPreviewCard title={d.title || filename} />
                  <div>
                    <h3 className="font-semibold truncate">{d.title || 'Untitled dashboard'}</h3>
                    <p className="text-sm text-text-secondary truncate mt-0.5">{filename}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="default">{rowCount.toLocaleString()} rows</Badge>
                      <span className="text-xs text-text-tertiary">
                        {new Date(d.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card className="p-8 text-center flex flex-col gap-4 items-center">
          <p className="text-text-secondary">Upload a dataset to generate your first dashboard.</p>
          <Link href="/upload">
            <Button>Upload data</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
