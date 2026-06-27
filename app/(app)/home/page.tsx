import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { DashboardPreviewCard } from '@/components/dashboard/DashboardPreviewCard'
import { DeleteDatasetButton } from '@/components/dashboard/DeleteDatasetButton'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type DashboardRow = {
  id: string
  created_at: string
  row_count: number | null
  uploads: { original_filename: string | null } | null
  dashboards: { id: string; title: string | null }[] | null
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: datasets, error } = await admin
    .from('datasets')
    .select(
      `
      id,
      created_at,
      row_count,
      uploads ( original_filename ),
      dashboards ( id, title )
    `
    )
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) {
    console.error('Datasets Query Error:', error)
  }

  const items = (datasets ?? []) as any[]

  return (
    <div className="page-container py-8 md:py-12 max-w-[var(--container-max)] flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold text-primary tracking-tight mb-2">Your Datasets</h1>
          <p className="text-text-secondary">
            {user?.email ? `Welcome back — ${user.email}` : 'Your AI-generated analytics at a glance.'}
          </p>
        </div>
        <Link href="/upload">
          <Button className="gap-2">
            <Icon name="upload" size={18} />
            New upload
          </Button>
        </Link>
      </div>

      {items.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => {
            const filename = d.uploads?.original_filename ?? 'Dataset'
            const rowCount = d.row_count ?? 0
            const dashboardTitle = d.dashboards?.[0]?.title
            return (
              <div key={d.id} className="relative group">
                <DeleteDatasetButton datasetId={d.id} />
                <Link href={`/dashboard/${d.id}`} className="block h-full">
                  <Card className="p-0 overflow-hidden hover:shadow-lg transition-all h-full flex flex-col">
                    <DashboardPreviewCard title={dashboardTitle || filename} datasetId={d.id} />
                    <div className="p-5 flex flex-col gap-2 flex-1">
                      <h3 className="font-semibold text-primary truncate group-hover:text-secondary transition-colors pr-8">
                        {dashboardTitle || 'Untitled dashboard'}
                      </h3>
                      <p className="text-sm text-text-secondary truncate">{filename}</p>
                      <div className="flex items-center gap-2 mt-auto pt-2">
                        <Badge variant="secondary">{rowCount.toLocaleString()} rows</Badge>
                        <span className="text-xs text-text-tertiary">
                          {new Date(d.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="p-12 text-center flex flex-col gap-5 items-center">
          <div className="w-14 h-14 rounded-xl ai-gradient flex items-center justify-center">
            <Icon name="auto_awesome" size={28} className="text-white" filled />
          </div>
          <p className="text-text-secondary max-w-md">
            Upload a dataset to generate your first interactive dashboard with AI insights.
          </p>
          <Link href="/upload">
            <Button className="gap-2">
              <Icon name="upload" size={18} />
              Upload data
            </Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
