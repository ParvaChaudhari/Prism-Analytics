'use client'

import { ChartCard } from '@/components/dashboard/ChartCard'
import { Skeleton } from '@/components/ui/Skeleton'
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
  chartData,
  chartsLoading,
  onDelete,
  onTitleChange,
}: {
  charts: ChartItem[]
  chartData: Record<string, Array<Record<string, string | number>>>
  chartsLoading?: boolean
  onDelete?: (id: string) => void
  onTitleChange?: (id: string, title: string) => void
}) {
  if (chartsLoading && !charts.length) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {charts.map((chart) => {
        const series = chartData[chart.id]
        const loadingChart = chartsLoading && !series

        return loadingChart ? (
          <Skeleton key={chart.id} className="h-80 rounded-[18px]" />
        ) : (
          <ChartCard
            key={chart.id}
            id={chart.id}
            title={chart.title}
            chartType={chart.chart_type}
            config={chart.config}
            series={series}
            isManual={chart.is_manual}
            onDelete={onDelete}
            onTitleChange={onTitleChange}
          />
        )
      })}
    </div>
  )
}
