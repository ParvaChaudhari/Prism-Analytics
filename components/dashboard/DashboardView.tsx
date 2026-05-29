'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { AISummaryCard } from '@/components/dashboard/AISummaryCard'
import { InsightCards } from '@/components/dashboard/InsightCards'
import { ChartGrid, type ChartItem } from '@/components/dashboard/ChartGrid'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { AddChartModal } from '@/components/dashboard/AddChartModal'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import type { Insight } from '@/types/dashboard'

type ApiDashboard = {
  id: string
  title: string
  ai_summary: string
  ai_insights: Insight[]
}

async function loadDashboard(datasetId: string, regenerate = false) {
  const res = await fetch('/api/dashboard/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ datasetId, regenerate }),
  })
  const data = (await res.json()) as {
    error?: string
    dashboard?: ApiDashboard
    charts?: ChartItem[]
    rows?: Array<Record<string, unknown>>
  }
  if (!res.ok) throw new Error(data.error || 'Failed to load dashboard')
  return data
}

export function DashboardView() {
  const params = useParams()
  const datasetId = typeof params.id === 'string' ? params.id : ''

  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<ApiDashboard | null>(null)
  const [charts, setCharts] = useState<ChartItem[]>([])
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const columns = useMemo(() => {
    if (!rows.length) return []
    return Object.keys(rows[0])
  }, [rows])

  const fetchDashboard = useCallback(
    async (regenerate = false) => {
      if (!datasetId) return
      const data = await loadDashboard(datasetId, regenerate)
      setDashboard(data.dashboard ?? null)
      setCharts(data.charts ?? [])
      setRows(data.rows ?? [])
    },
    [datasetId]
  )

  useEffect(() => {
    if (!datasetId) {
      setLoading(false)
      setError('Invalid dashboard link.')
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        await fetchDashboard(false)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [datasetId, fetchDashboard])

  async function handleRegenerate() {
    if (!confirm('Regenerate AI charts? Manual charts will be kept.')) return
    setRegenerating(true)
    setError(null)
    try {
      await fetchDashboard(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regeneration failed.')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleDelete(chartId: string) {
    const res = await fetch(`/api/dashboard/charts/${chartId}`, { method: 'DELETE' })
    if (!res.ok) {
      setError('Failed to delete chart.')
      return
    }
    setCharts((prev) => prev.filter((c) => c.id !== chartId))
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

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
        <Card className="p-6 flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <p className="text-sm text-text-secondary pt-2">Prism is reading your data…</p>
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
        onAddChart={() => setModalOpen(true)}
        onRegenerate={handleRegenerate}
        regenerating={regenerating}
      />

      {error ? (
        <Card className="p-4 text-sm text-destructive border border-destructive/20 bg-destructive/10">
          {error}
        </Card>
      ) : null}

      <AISummaryCard title={dashboard.title} summary={dashboard.ai_summary} />
      <InsightCards insights={dashboard.ai_insights} />
      <ChartGrid
        charts={charts}
        rows={rows}
        onDelete={handleDelete}
        onTitleChange={handleTitleChange}
      />

      <AddChartModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        datasetId={datasetId}
        columns={columns}
        onCreated={(chart) => setCharts((prev) => [...prev, chart])}
      />

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        dashboardId={dashboard.id}
      />
    </div>
  )
}
