import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: dashboards } = await supabase
    .from('dashboards')
    .select('id, title, dataset_id, created_at')
    .order('created_at', { ascending: false })
    .limit(12)

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
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

      {dashboards?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {dashboards.map((d) => (
            <Link key={d.id} href={`/dashboard/${d.dataset_id}`}>
              <Card className="p-5 hover:bg-surface transition-colors">
                <h3 className="font-semibold">{d.title || 'Untitled dashboard'}</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </Card>
            </Link>
          ))}
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

