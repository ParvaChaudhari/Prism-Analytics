'use client'

import type { FormEvent } from 'react'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChartRenderer } from '@/components/dashboard/ChartRenderer'
import type { ChartConfig, ChartType, GeneratedChart, ChartDataPoint } from '@/types/dashboard'

type Props = {
  isOpen: boolean
  onClose: () => void
  datasetId: string
  columns: string[]
  schema?: Array<{ name: string; type: string }>
  onCreated: (chart: {
    id: string
    title: string
    chart_type: ChartType
    config: ChartConfig
    is_manual?: boolean
  }) => void
}

const CHART_TYPES: ChartType[] = ['bar', 'line', 'area', 'pie', 'scatter', 'stat']
const AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max', 'none'] as const

export function AddChartModal({ isOpen, onClose, datasetId, columns, schema, onCreated }: Props) {
  const [tab, setTab] = useState<'magic' | 'manual'>('magic')
  const [title, setTitle] = useState('')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [xAxis, setXAxis] = useState('')
  const [yAxis, setYAxis] = useState('')
  const [aggregation, setAggregation] = useState<ChartConfig['aggregation']>('sum')
  const [description, setDescription] = useState('')
  const [nlPrompt, setNlPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [nlLoading, setNlLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Preview state
  const [previewData, setPreviewData] = useState<ChartDataPoint[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  // Smart filtering using schema if available
  const numericColumns = schema
    ? schema.filter((c) => c.type === 'number').map((c) => c.name)
    : columns

  const categoricalColumns = schema
    ? schema.filter((c) => c.type !== 'number').map((c) => c.name)
    : columns

  function applyGenerated(chart: GeneratedChart) {
    setTitle(chart.title)
    setChartType(chart.chart_type)
    setXAxis(chart.xAxis ?? '')
    setYAxis(chart.yAxis ?? '')
    setAggregation(chart.aggregation ?? 'sum')
    setDescription(chart.description)
    setTab('manual')
  }

  useEffect(() => {
    if (tab !== 'manual' || !isOpen || !datasetId) return

    const fetchPreview = async () => {
      setPreviewLoading(true)
      try {
        const config: ChartConfig = {
          xAxis: xAxis || undefined,
          yAxis: yAxis || undefined,
          aggregation,
        }
        const res = await fetch(`/api/dashboard/${datasetId}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config, chartType, columns }),
        })
        const data = await res.json()
        if (res.ok) setPreviewData(data.data ?? [])
      } catch {
        // ignore preview errors quietly
      } finally {
        setPreviewLoading(false)
      }
    }

    const timer = setTimeout(fetchPreview, 400)
    return () => clearTimeout(timer)
  }, [tab, isOpen, datasetId, xAxis, yAxis, aggregation, chartType, columns])

  async function handleNlGenerate() {
    if (!nlPrompt.trim()) return
    setNlLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/nl-to-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId, prompt: nlPrompt }),
      })
      const data = (await res.json()) as { chart?: GeneratedChart; error?: string }
      if (!res.ok) throw new Error(data.error || 'Failed to parse request')
      if (data.chart) applyGenerated(data.chart)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setNlLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const config: ChartConfig = {
        xAxis: xAxis || undefined,
        yAxis: yAxis || undefined,
        aggregation,
        description: description || undefined,
      }

      const res = await fetch('/api/dashboard/charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId,
          title: title.trim(),
          chart_type: chartType,
          config,
        }),
      })
      const data = (await res.json()) as {
        chart?: {
          id: string
          title: string
          chart_type: ChartType
          config: ChartConfig
        }
        error?: string
      }
      if (!res.ok) throw new Error(data.error || 'Failed to add chart')

      if (data.chart) {
        onCreated({ ...data.chart, is_manual: true })
        onClose()
        // Reset states
        setTitle('')
        setNlPrompt('')
        setDescription('')
        setXAxis('')
        setYAxis('')
        setPreviewData([])
        setTab('magic')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Chart" className="max-w-4xl">
      <div className="flex border-b border-border-subtle mb-4 gap-4">
        <button
          onClick={() => setTab('magic')}
          className={`pb-2 text-sm font-medium transition-colors ${
            tab === 'magic' ? 'border-b-2 border-primary text-primary' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          ✨ Magic AI
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`pb-2 text-sm font-medium transition-colors ${
            tab === 'manual' ? 'border-b-2 border-primary text-primary' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          ⚙️ Manual Builder
        </button>
      </div>

      {tab === 'magic' && (
        <div className="flex flex-col gap-4 py-4 min-h-[300px] justify-center items-center text-center">
          <div className="w-12 h-12 rounded-xl ai-gradient flex items-center justify-center mb-2">
            <span className="text-white text-2xl">✨</span>
          </div>
          <h3 className="text-lg font-semibold">Describe your chart</h3>
          <p className="text-sm text-text-secondary max-w-sm mb-2">
            Just tell us what you want to see, and AI will build the chart configuration for you.
          </p>
          <textarea
            className="w-full max-w-lg min-h-[100px] rounded-[10px] border border-border-subtle bg-background px-4 py-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            placeholder='e.g. "Show revenue grouped by region as a stacked bar chart"'
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
          />
          <Button
            type="button"
            disabled={nlLoading || !nlPrompt.trim()}
            onClick={handleNlGenerate}
            className="mt-2 min-w-[200px]"
          >
            {nlLoading ? 'Generating…' : 'Generate Chart'}
          </Button>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>
      )}

      {tab === 'manual' && (
        <form className="flex flex-col md:flex-row gap-8" onSubmit={handleSubmit}>
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Chart Type</label>
              <select
                className="h-10 rounded-[10px] border border-border-subtle bg-background px-3 text-[15px]"
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
              >
                {CHART_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">X Axis (Category/Date)</label>
                <select
                  className="h-10 rounded-[10px] border border-border-subtle bg-background px-3 text-[15px]"
                  value={xAxis}
                  onChange={(e) => setXAxis(e.target.value)}
                >
                  <option value="">— None —</option>
                  {categoricalColumns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <optgroup label="Numeric Columns">
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Y Axis (Value)</label>
                <select
                  className="h-10 rounded-[10px] border border-border-subtle bg-background px-3 text-[15px]"
                  value={yAxis}
                  onChange={(e) => setYAxis(e.target.value)}
                >
                  <option value="">— None —</option>
                  {numericColumns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Aggregation</label>
              <select
                className="h-10 rounded-[10px] border border-border-subtle bg-background px-3 text-[15px]"
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value as ChartConfig['aggregation'])}
              >
                {AGGREGATIONS.map((a) => (
                  <option key={a} value={a}>{a.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-[10px] px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? 'Adding…' : 'Add Chart to Dashboard'}
            </Button>
          </div>

          <div className="flex-1 border-l border-border-subtle pl-8 flex flex-col">
            <h3 className="text-sm font-medium mb-4 text-text-secondary">Live Preview</h3>
            <div className="flex-1 bg-surface-base rounded-xl border border-border-subtle p-4 min-h-[300px] flex items-center justify-center relative">
              {previewLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {previewData.length > 0 ? (
                <div className="w-full h-full min-h-[250px]">
                  <ChartRenderer
                    chartType={chartType}
                    config={{ xAxis, yAxis, aggregation }}
                    series={previewData}
                  />
                </div>
              ) : (
                <p className="text-text-tertiary text-sm">Select configuration to preview</p>
              )}
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
