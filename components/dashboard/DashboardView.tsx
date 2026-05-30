'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { AISummaryCard } from '@/components/dashboard/AISummaryCard'
import { InsightCards } from '@/components/dashboard/InsightCards'
import { ChartGrid, type ChartItem } from '@/components/dashboard/ChartGrid'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { AddChartModal } from '@/components/dashboard/AddChartModal'
import { CompareModal } from '@/components/dashboard/CompareModal'
import { StoryModal } from '@/components/dashboard/StoryModal'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { exportDashboardPdf } from '@/lib/dashboard/export-pdf'
import {
  clearDashboardCache,
  readDashboardCache,
  writeDashboardCache,
} from '@/lib/dashboard/dashboard-cache'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import type { Insight } from '@/types/dashboard'

type ApiDashboard = {
  id: string
  title: string
  ai_summary: string
  ai_insights: Insight[]
}

async function fetchChartData(datasetId: string) {
  const res = await fetch(`/api/dashboard/${datasetId}/chart-data`)
  const data = (await res.json()) as {
    chartData?: Record<string, Array<Record<string, string | number>>>
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
  const [chartData, setChartData] = useState<
    Record<string, Array<Record<string, string | number>>>
  >({})
  const [modalOpen, setModalOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)

  const loadChartData = useCallback(
    async (
      id: string,
      cachePayload?: {
        dashboard: ApiDashboard
        charts: ChartItem[]
        columns: string[]
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
        error?: string
        dashboard?: ApiDashboard
        charts?: ChartItem[]
        columns?: string[]
      }
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      const nextDashboard = data.dashboard!
      const nextCharts = data.charts ?? []
      const nextColumns = data.columns ?? []

      setDashboard(nextDashboard)
      setCharts(nextCharts)
      setColumns(nextColumns)
      clearDashboardCache(id)

      await loadChartData(id, {
        dashboard: nextDashboard,
        charts: nextCharts,
        columns: nextColumns,
      })
    },
    [loadChartData]
  )

  useEffect(() => {
    if (!datasetId) {
      setShellLoading(false)
      setError('Invalid dashboard link.')
      return
    }

    let cancelled = false

    async function init() {
      setError(null)

      const cached = readDashboardCache(datasetId)
      if (cached) {
        setDashboard(cached.dashboard)
        setCharts(cached.charts)
        setColumns(cached.columns)
        setChartData(cached.chartData)
        setShellLoading(false)
      } else {
        setShellLoading(true)
      }

      try {
        const res = await fetch(`/api/dashboard/${datasetId}`)
        const data = (await res.json()) as {
          exists?: boolean
          dashboard?: ApiDashboard
          charts?: ChartItem[]
          columns?: string[]
          error?: string
        }

        if (!res.ok) throw new Error(data.error || 'Failed to load dashboard')
        if (cancelled) return

        if (!data.exists) {
          setGenerating(true)
          setShellLoading(false)
          await runGenerate(datasetId, false)
          if (!cancelled) setGenerating(false)
          return
        }

        const nextDashboard = data.dashboard!
        const nextCharts = data.charts ?? []
        const nextColumns = data.columns ?? []

        setDashboard(nextDashboard)
        setCharts(nextCharts)
        setColumns(nextColumns)
        setShellLoading(false)

        const hasCachedCharts = cached?.chartData && Object.keys(cached.chartData).length > 0

        if (!hasCachedCharts) {
          await loadChartData(datasetId, {
            dashboard: nextDashboard,
            charts: nextCharts,
            columns: nextColumns,
          })
        } else {
          loadChartData(datasetId, {
            dashboard: nextDashboard,
            charts: nextCharts,
            columns: nextColumns,
          }).catch(() => {})
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Something went wrong.')
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
      await exportDashboardPdf(exportRef.current, `${safeName || 'dashboard'}.pdf`)
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
      await loadChartData(datasetId, { dashboard, charts: nextCharts, columns })
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
      await loadChartData(datasetId, { dashboard, charts: nextCharts, columns })
    }
  }

  if (shellLoading || generating) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
        <Card className="p-6 flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <p className="text-sm text-text-secondary pt-2">
            {generating ? 'Prism is reading your data…' : 'Loading dashboard…'}
          </p>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (error && !dashboard) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-6 text-destructive">{error}</Card>
      </div>
    )
  }

  if (!dashboard) return null

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <DashboardHeader
        onAskAi={() => setChatOpen(true)}
        onCompare={() => setCompareOpen(true)}
        onStory={() => setStoryOpen(true)}
        onExport={handleExport}
        onAddChart={() => setModalOpen(true)}
        onRegenerate={handleRegenerate}
        regenerating={regenerating}
        exporting={exporting}
      />

      {error ? (
        <Card className="p-4 text-sm text-destructive border border-destructive/20 bg-destructive/10">
          {error}
        </Card>
      ) : null}

      <div ref={exportRef} className="flex flex-col gap-6 bg-background">
        <AISummaryCard title={dashboard.title} summary={dashboard.ai_summary} />
        <InsightCards insights={dashboard.ai_insights} />
        <ChartGrid
          charts={charts}
          chartData={chartData}
          chartsLoading={chartsLoading}
          onDelete={handleDelete}
          onTitleChange={handleTitleChange}
        />
      </div>

      <AddChartModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        datasetId={datasetId}
        columns={columns}
        onCreated={handleChartCreated}
      />

      <CompareModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        currentDatasetId={datasetId}
      />

      <StoryModal
        isOpen={storyOpen}
        onClose={() => setStoryOpen(false)}
        dashboardId={dashboard.id}
      />

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        dashboardId={dashboard.id}
      />
    </div>
  )
}
