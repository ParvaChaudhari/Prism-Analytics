'use client'

import { ChartCard } from '@/components/dashboard/ChartCard'
import type { ChartConfig, ChartType } from '@/types/dashboard'

export type ChartItem = {
  id: string
  title: string
  chart_type: ChartType
  config: ChartConfig
  is_manual?: boolean
}

export function ChartGrid({
  charts,
  rows,
  onDelete,
  onTitleChange,
}: {
  charts: ChartItem[]
  rows: Array<Record<string, unknown>>
  onDelete?: (id: string) => void
  onTitleChange?: (id: string, title: string) => void
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {charts.map((chart) => (
        <ChartCard
          key={chart.id}
          id={chart.id}
          title={chart.title}
          chartType={chart.chart_type}
          config={chart.config}
          rows={rows}
          isManual={chart.is_manual}
          onDelete={onDelete}
          onTitleChange={onTitleChange}
        />
      ))}
    </div>
  )
}
