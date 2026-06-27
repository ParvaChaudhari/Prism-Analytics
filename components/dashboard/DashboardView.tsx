'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
// AISummaryCard removed

import { ChartGrid, type ChartItem } from '@/components/dashboard/ChartGrid'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { AddChartModal } from '@/components/dashboard/AddChartModal'
import { VirtualizedTable } from '@/components/dashboard/VirtualizedTable'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { exportDashboardPdf } from '@/lib/dashboard/export-pdf'
import {
  clearDashboardCache,
  readDashboardCache,
  writeDashboardCache,
} from '@/lib/dashboard/dashboard-cache'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { GalaxyLoading } from '@/components/ui/GalaxyLoading'
import type { Insight, ChartDataPoint } from '@/types/dashboard'

type ApiDashboard = {
  id: string
  title: string
  ai_summary: string
  ai_insights: Insight[]
}

async function fetchChartData(datasetId: string) {
  const res = await fetch(`/api/dashboard/${datasetId}/chart-data`)
  const data = (await res.json()) as {
    chartData?: Record<string, ChartDataPoint[]>
    columns?: string[]
    error?: string
  }
  if (!res.ok) throw new Error(data.error || 'Failed to load chart data')
  return data
}

export function DashboardView() {
  const params = useParams()
  const datasetId = typeof params.id === 'string' ? params.id : ''
  const exportRef = useRef<HTMLDivElement>(null)

  const [shellLoading, setShellLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<ApiDashboard | null>(null)
  const [charts, setCharts] = useState<ChartItem[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [schema, setSchema] = useState<Array<{ name: string; type: string }>>([])
  const [chartData, setChartData] = useState<Record<string, ChartDataPoint[]>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingChartId, setPendingChartId] = useState<string | null>(null)

  const [activeView, setActiveView] = useState<'charts' | 'data'>('charts')
  const [rawData, setRawData] = useState<Array<Record<string, string | number>>>([])
  const [rawDataLoading, setRawDataLoading] = useState(false)
  const [rawDataLoaded, setRawDataLoaded] = useState(false)

  const fetchRawData = useCallback(async () => {
    if (rawDataLoaded || !datasetId) return
    setRawDataLoading(true)
    try {
      const res = await fetch(`/api/dashboard/${datasetId}/raw-data`)
      const data = await res.json()
      if (res.ok) {
        setRawData(data.rows || [])
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      console.error(err)
      setError('Failed to load raw data')
    } finally {
      setRawDataLoading(false)
      setRawDataLoaded(true)
    }
  }, [datasetId, rawDataLoaded])

  const handleViewChange = useCallback((view: 'charts' | 'data') => {
    setActiveView(view)
    if (view === 'data' && !rawDataLoaded) {
      fetchRawData()
    }
  }, [rawDataLoaded, fetchRawData])

  const loadChartData = useCallback(
    async (
      id: string,
      cachePayload?: {
        dashboard: ApiDashboard
        charts: ChartItem[]
        columns: string[]
        schema: Array<{ name: string; type: string }>
      }
    ) => {
      setChartsLoading(true)
      try {
        const data = await fetchChartData(id)
        setChartData(data.chartData ?? {})
        const cols = data.columns ?? cachePayload?.columns ?? []
        if (data.columns?.length) setColumns(data.columns)

        if (cachePayload) {
          writeDashboardCache(id, {
            ...cachePayload,
            columns: cols,
            chartData: data.chartData ?? {},
          })
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load charts.')
      } finally {
        setChartsLoading(false)
      }
    },
    []
  )

  const runGenerate = useCallback(
    async (id: string, regenerate = false) => {
      const res = await fetch('/api/dashboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: id, regenerate }),
      })
      const data = (await res.json()) as {
        dashboard?: ApiDashboard
        charts?: ChartItem[]
        columns?: string[]
        schema?: Array<{ name: string; type: string }>
        error?: string
      }
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      if (!data.dashboard) throw new Error('No dashboard returned')
      setDashboard(data.dashboard)
      setCharts(data.charts ?? [])
      if (data.columns?.length) setColumns(data.columns)
      if (data.schema?.length) setSchema(data.schema)
      await loadChartData(id, {
        dashboard: data.dashboard,
        charts: data.charts ?? [],
        columns: data.columns ?? [],
        schema: data.schema ?? [],
      })
    },
    [loadChartData]
  )

  useEffect(() => {
    if (!datasetId) return

    let cancelled = false

    async function init() {
      setShellLoading(true)
      setError(null)

      const cached = readDashboardCache(datasetId)
      if (cached?.dashboard) {
        setDashboard(cached.dashboard)
        setCharts(cached.charts ?? [])
        setColumns(cached.columns ?? [])
        setSchema(cached.schema ?? [])
        if (cached.chartData && Object.keys(cached.chartData).length) {
          setChartData(cached.chartData)
          setShellLoading(false)
          loadChartData(datasetId, {
            dashboard: cached.dashboard,
            charts: cached.charts ?? [],
            columns: cached.columns ?? [],
            schema: cached.schema ?? [],
          })
          return
        }
      }

      try {
        const res = await fetch(`/api/dashboard/${datasetId}`)

        if (res.status === 404) {
          if (cancelled) return
          setGenerating(true)
          setShellLoading(false)
          await runGenerate(datasetId)
          if (!cancelled) setGenerating(false)
          return
        }

        let data: {
          dashboard?: ApiDashboard
          charts?: ChartItem[]
          columns?: string[]
          schema?: Array<{ name: string; type: string }>
          error?: string
        }
        try {
          data = await res.json()
        } catch {
          throw new Error(res.ok ? 'Invalid response from server' : 'Failed to load dashboard')
        }

        if (!res.ok) throw new Error(data.error || 'Failed to load dashboard')

        if (cancelled) return
        if (!data.dashboard) throw new Error('Dashboard not found')

        setDashboard(data.dashboard)
        setCharts(data.charts ?? [])
        if (data.columns?.length) setColumns(data.columns)
        if (data.schema?.length) setSchema(data.schema)
        setShellLoading(false)
        await loadChartData(datasetId, {
          dashboard: data.dashboard,
          charts: data.charts ?? [],
          columns: data.columns ?? [],
          schema: data.schema ?? [],
        })
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Failed to load dashboard.'
        if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
          try {
            setGenerating(true)
            setShellLoading(false)
            await runGenerate(datasetId)
          } catch (genErr) {
            setError(genErr instanceof Error ? genErr.message : msg)
          } finally {
            if (!cancelled) setGenerating(false)
          }
        } else {
          setError(msg)
          setShellLoading(false)
        }
      } finally {
        if (!cancelled) {
          setShellLoading(false)
          setGenerating(false)
        }
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [datasetId, runGenerate, loadChartData])

  async function handleRegenerate() {
    if (!confirm('Regenerate AI charts? Manual charts will be kept.')) return
    setRegenerating(true)
    setError(null)
    try {
      clearDashboardCache(datasetId)
      await runGenerate(datasetId, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regeneration failed.')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleExport() {
    if (!exportRef.current || !dashboard) return
    setExporting(true)
    setError(null)
    try {
      const safeName = dashboard.title.replace(/[^\w\-]+/g, '-').slice(0, 40)
      await exportDashboardPdf(exportRef.current, dashboard.title, `${safeName || 'dashboard'}.pdf`)
    } catch {
      setError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete(chartId: string) {
    const res = await fetch(`/api/dashboard/charts/${chartId}`, { method: 'DELETE' })
    if (!res.ok) {
      setError('Failed to delete chart.')
      return
    }
    const nextCharts = charts.filter((c) => c.id !== chartId)
    setCharts(nextCharts)
    clearDashboardCache(datasetId)
    if (dashboard) {
      await loadChartData(datasetId, { dashboard, charts: nextCharts, columns, schema })
    }
  }

  async function handleTitleChange(chartId: string, title: string) {
    const res = await fetch(`/api/dashboard/charts/${chartId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) {
      setError('Failed to update title.')
      return
    }
    setCharts((prev) => prev.map((c) => (c.id === chartId ? { ...c, title } : c)))
  }

  async function handleChartCreated(chart: ChartItem) {
    const nextCharts = [...charts, chart]
    setCharts(nextCharts)
    clearDashboardCache(datasetId)
    if (dashboard) {
      await loadChartData(datasetId, { dashboard, charts: nextCharts, columns, schema })
    }
  }

  if (shellLoading || generating) {
    return (
      <div className="flex-1 w-full flex flex-col">
        <GalaxyLoading text={generating ? 'Prism is reading your data…' : 'Loading dashboard…'} />
      </div>
    )
  }

  if (error && !dashboard) {
    return (
      <div className="page-container py-8 max-w-[var(--container-max)]">
        <Card className="p-6 text-destructive">{error}</Card>
      </div>
    )
  }

  if (!dashboard) return null

  return (
    <>
      <div
        className="flex-1 flex flex-col min-h-0 page-container py-6 gap-6"
      >
        <DashboardHeader
          title={dashboard?.title ?? 'Loading Dashboard...'}
          onAskAi={() => setChatOpen(true)}
          onAddChart={() => setModalOpen(true)}
          onRegenerate={handleRegenerate}
          onExport={handleExport}
          regenerating={regenerating}
          exporting={exporting}
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        <div ref={exportRef} className="flex-1 flex flex-col gap-6 min-h-0 bg-background">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 font-medium"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeView === 'charts' ? (
            <ChartGrid
              charts={charts}
              chartData={chartData}
              chartsLoading={chartsLoading}
              onDelete={handleDelete}
              onTitleChange={handleTitleChange}
              onAskAboutChart={(chartId) => {
                setPendingChartId(chartId)
                setChatOpen(true)
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {rawDataLoading ? (
                <div className="flex-1 flex flex-col gap-4">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="flex-1 w-full rounded-xl" />
                </div>
              ) : (
                <VirtualizedTable data={rawData} columns={columns} />
              )}
            </div>
          )}
        </div>

        <AddChartModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          datasetId={datasetId}
          columns={columns}
          schema={schema}
          onCreated={handleChartCreated}
        />
      </div>

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        dashboardId={dashboard.id}
        charts={charts}
        chartData={chartData}
        pendingChartId={pendingChartId}
        onPendingChartConsumed={() => setPendingChartId(null)}
      />
    </>
  )
}