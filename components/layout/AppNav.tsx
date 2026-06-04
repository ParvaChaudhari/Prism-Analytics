'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

const links = [
  { href: '/home', label: 'Dashboards' },
  { href: '/upload', label: 'Datasets' },
]

function isActive(pathname: string, href: string) {
  if (href === '/home') return pathname === '/home' || pathname.startsWith('/dashboard')
  if (href === '/upload') return pathname === '/upload' || pathname.startsWith('/health')
  return pathname.startsWith(href)
}

export function AppNav() {
  const pathname = usePathname()

  return (
    <header className="glass-nav sticky top-0 z-40 w-full">
      <div className="page-container flex h-16 items-center justify-between max-w-[var(--container-max)]">
        <div className="flex items-center gap-8 md:gap-12">
          <Link href="/home" className="text-xl font-bold tracking-tight text-primary">
            Prism
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {links.map((link) => {
              const active = isActive(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    'text-sm font-medium transition-colors duration-200 pb-0.5',
                    active
                      ? 'text-primary font-semibold border-b-2 border-primary'
                      : 'text-text-secondary hover:text-primary',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/upload">
            <Button size="sm" className="gap-1.5">
              <Icon name="upload" size={18} />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </Link>
          <div
            className="w-8 h-8 rounded-full bg-surface-container-high border border-border-subtle flex items-center justify-center text-primary"
            aria-hidden
          >
            <Icon name="account_circle" size={22} />
          </div>
        </div>
      </div>
    </header>
  )
}
