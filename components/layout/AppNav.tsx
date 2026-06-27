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
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const accountDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false)
    setAccountDropdownOpen(false)
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

  async function deleteDataset(id: string) {
    if (!confirm('Are you sure you want to delete this dataset? This will also delete any associated dashboards and charts.')) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/datasets/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDatasets(prev => prev.filter(ds => ds.id !== id))
        if (pathname.includes(id)) {
          router.push('/home')
        }
      }
    } catch (err) {
      console.error('Failed to delete dataset:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="bg-white border-b border-border-subtle sticky top-0 z-40 w-full">
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
                          <li key={ds.id} className="relative group flex items-center">
                            <button
                              onClick={() => {
                                setDropdownOpen(false)
                                router.push(`/dashboard/${ds.id}`)
                              }}
                              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                                <Icon name="table_chart" size={16} className="text-text-secondary group-hover:text-primary transition-colors" />
                              </div>
                              <div className="min-w-0 flex-1 pr-8">
                                <p className="text-[13px] font-medium text-primary truncate">
                                  {ds.name}
                                </p>
                                <p className="text-[11px] text-text-secondary">
                                  {ds.row_count?.toLocaleString() ?? '—'} rows
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                await deleteDataset(ds.id)
                              }}
                              className="absolute right-2 p-1.5 rounded-md hover:bg-red-50 text-text-secondary hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete dataset"
                            >
                              <Icon name="delete" size={16} />
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

        <div className="flex items-center gap-4 relative" ref={accountDropdownRef}>
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className="w-8 h-8 rounded-full bg-surface-container-high border border-border-subtle flex items-center justify-center text-primary hover:bg-surface-container transition-colors"
            aria-label="Account menu"
          >
            <Icon name="account_circle" size={22} />
          </button>

          {accountDropdownOpen && (
            <div className="absolute top-full right-0 mt-3 w-48 bg-white border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50 p-2">
              {/* Arrow */}
              <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-l border-t border-border-subtle rotate-45" />

              <button
                onClick={async () => {
                  setAccountDropdownOpen(false)
                  const { createClient } = await import('@/lib/supabase/client')
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="relative w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-container-low transition-colors text-[13px] font-medium text-red-600 hover:text-red-700"
              >
                <Icon name="logout" size={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
