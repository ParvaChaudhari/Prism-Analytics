import Link from 'next/link'
import { LayoutDashboard, Settings, FileSpreadsheet } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border-subtle bg-surface flex-col h-screen hidden md:flex">
      <div className="p-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold">P</div>
        <span className="font-semibold text-lg tracking-tight">Prism</span>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1">
        <Link href="/home" className="flex items-center gap-3 px-3 py-2 rounded-md bg-surface-elevated text-accent font-medium shadow-sm">
          <LayoutDashboard size={18} />
          Dashboards
        </Link>
        <Link href="/datasets" className="flex items-center gap-3 px-3 py-2 rounded-md text-text-secondary hover:bg-border-subtle hover:text-text-primary transition-colors font-medium">
          <FileSpreadsheet size={18} />
          Datasets
        </Link>
      </nav>

      <div className="p-4 border-t border-border-subtle">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md text-text-secondary hover:bg-border-subtle hover:text-text-primary transition-colors font-medium">
          <Settings size={18} />
          Settings
        </Link>
      </div>
    </aside>
  )
}
