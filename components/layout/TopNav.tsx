import { Button } from '@/components/ui/Button'
import { Upload } from 'lucide-react'
import Link from 'next/link'

export function TopNav() {
  return (
    <header className="h-16 border-b border-border-subtle bg-background flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="font-semibold text-lg">Dashboards</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <Link href="/upload">
          <Button size="sm" className="gap-2">
            <Upload size={16} />
            New Upload
          </Button>
        </Link>
        <div className="w-8 h-8 rounded-full bg-border-subtle flex items-center justify-center text-sm font-medium">
          U
        </div>
      </div>
    </header>
  )
}
