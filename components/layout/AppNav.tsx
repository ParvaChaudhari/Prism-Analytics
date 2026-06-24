'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

type Dataset = {
  id: string
  name: string
  row_count: number
  created_at: string
}

function isActive(pathname: string, href: string) {
  if (href === '/home') return pathname === '/home' || pathname.startsWith('/dashboard')
  if (href === '/upload') return pathname === '/upload' || pathname.startsWith('/health')
  return pathname.startsWith(href)
}

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false)
  }, [pathname])

  async function openDatasets() {
    if (dropdownOpen) {
      setDropdownOpen(false)
      return
    }
    setDropdownOpen(true)
    setLoading(true)
    try {
      const res = await fetch('/api/datasets')
      const data = await res.json() as { datasets?: Dataset[] }
      setDatasets(data.datasets ?? [])
    } catch {
      setDatasets([])
    } finally {
      setLoading(false)
    }
  }

  const isDashboardActive = pathname.startsWith('/dashboard')
  const isUploadActive = pathname === '/upload' || pathname.startsWith('/health')

  return (
    <header className="glass-nav sticky top-0 z-40 w-full">
      <div className="page-container flex h-12 items-center justify-between max-w-[var(--container-max)]">
        <div className="flex h-full gap-8 md:gap-12">
          <Link href="/home" className="self-center text-[18px] font-bold tracking-tight text-primary">
            Prism
          </Link>

          <nav className="hidden md:flex items-stretch h-full">
            {/* Dashboard tab (only visible when viewing a dashboard) */}
            {isDashboardActive && (
              <div
                className="text-[13px] font-medium transition-colors duration-200 flex items-center px-3 text-primary font-semibold bg-surface-container border-b-2 border-primary"
              >
                Dashboard
              </div>
            )}

            {/* Datasets dropdown */}
            <div className="relative flex items-stretch" ref={dropdownRef}>
              <button
                onClick={openDatasets}
                className={[
                  'text-[13px] font-medium transition-colors duration-200 flex items-center gap-1 px-3',
                  dropdownOpen
                    ? 'text-primary font-semibold bg-surface-container'
                    : 'text-text-secondary hover:bg-surface-container-low hover:text-primary',
                ].join(' ')}
              >
                Datasets
                <Icon
                  name="keyboard_arrow_down"
                  size={16}
                  className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-white border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50">
                  {/* Arrow */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-border-subtle rotate-45" />

                  <div className="p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary px-3 py-2">
                      Your Datasets
                    </p>

                    {loading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="w-5 h-5 border-2 border-border-subtle border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : datasets.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-[12px] text-text-secondary">No datasets yet</p>
                        <Link
                          href="/upload"
                          className="text-[12px] text-primary font-medium hover:underline mt-1 inline-block"
                        >
                          Upload one →
                        </Link>
                      </div>
                    ) : (
                      <ul>
                        {datasets.map((ds) => (
                          <li key={ds.id}>
                            <button
                              onClick={() => {
                                setDropdownOpen(false)
                                router.push(`/dashboard/${ds.id}`)
                              }}
                              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                                <Icon name="table_chart" size={16} className="text-text-secondary group-hover:text-primary transition-colors" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-primary truncate">
                                  {ds.name}
                                </p>
                                <p className="text-[11px] text-text-secondary">
                                  {ds.row_count?.toLocaleString() ?? '—'} rows
                                </p>
                              </div>
                              <Icon name="arrow_forward" size={14} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="border-t border-border-subtle p-2">
                    <Link
                      href="/upload"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-container-low transition-colors text-[13px] font-medium text-primary"
                    >
                      <Icon name="upload" size={16} />
                      Upload new dataset
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Upload tab */}
            <Link
              href="/upload"
              className={[
                'text-[13px] font-medium transition-colors duration-200 flex items-center px-3',
                isUploadActive
                  ? 'text-primary font-semibold bg-surface-container border-b-2 border-primary'
                  : 'text-text-secondary hover:bg-surface-container-low hover:text-primary',
              ].join(' ')}
            >
              Upload
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
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
