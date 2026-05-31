'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { ChartConfig, ChartType, GeneratedChart } from '@/types/dashboard'

type Props = {
  isOpen: boolean
  onClose: () => void
  datasetId: string
  columns: string[]
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

export function AddChartModal({ isOpen, onClose, datasetId, columns, onCreated }: Props) {
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

  function applyGenerated(chart: GeneratedChart) {
    setTitle(chart.title)
    setChartType(chart.chart_type)
    setXAxis(chart.xAxis ?? '')
    setYAxis(chart.yAxis ?? '')
    setAggregation(chart.aggregation ?? 'sum')
    setDescription(chart.description)
  }

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
        setTitle('')
        setNlPrompt('')
        setDescription('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add chart">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Describe in plain English</label>
          <textarea
            className="min-h-[72px] w-full rounded-[10px] border border-border-subtle bg-background px-3 py-2 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            placeholder='e.g. "Show revenue by region as a bar chart"'
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={nlLoading || !nlPrompt.trim()}
            onClick={handleNlGenerate}
          >
            {nlLoading ? 'Parsing…' : 'Fill from description'}
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Chart type</label>
          <select
            className="h-10 rounded-[10px] border border-border-subtle bg-background px-3 text-[15px]"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
          >
            {CHART_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">X axis</label>
            <select
              className="h-10 rounded-[10px] border border-border-subtle bg-background px-3 text-[15px]"
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
            >
              <option value="">—</option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Y axis</label>
            <select
              className="h-10 rounded-[10px] border border-border-subtle bg-background px-3 text-[15px]"
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
            >
              <option value="">—</option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
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
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Description (optional)</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {error ? (
          <p className="text-sm text-destructive bg-destructive/10 rounded-[10px] px-3 py-2">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Add chart'}
        </Button>
      </form>
    </Modal>
  )
}
