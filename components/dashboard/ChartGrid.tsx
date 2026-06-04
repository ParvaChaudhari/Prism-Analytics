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
  const statCharts = charts.filter((c) => c.chart_type === 'stat')
  const regularCharts = charts.filter((c) => c.chart_type !== 'stat')

  if (chartsLoading && !charts.length) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 lg:row-span-2" />
          <Skeleton className="h-80 lg:col-span-1" />
          <Skeleton className="h-80 lg:col-span-1" />
          <Skeleton className="h-80 lg:col-span-3" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {statCharts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {statCharts.map((chart) => {
            const series = chartData[chart.id]
            return chartsLoading && !series ? (
              <Skeleton key={chart.id} className="h-32 rounded-xl" />
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
      )}

      {regularCharts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {regularCharts.map((chart, i) => {
            const series = chartData[chart.id]
            const loadingChart = chartsLoading && !series

            let gridClass = ''
            if (i === 0) gridClass = 'lg:col-span-2 lg:row-span-2'
            else if (i === 1 || i === 2) gridClass = 'lg:col-span-1'
            else gridClass = 'lg:col-span-3'

            return loadingChart ? (
              <Skeleton key={chart.id} className={`h-full min-h-[400px] rounded-xl ${gridClass}`} />
            ) : (
              <div key={chart.id} className={gridClass}>
                <ChartCard
                  id={chart.id}
                  title={chart.title}
                  chartType={chart.chart_type}
                  config={chart.config}
                  series={series}
                  isManual={chart.is_manual}
                  onDelete={onDelete}
                  onTitleChange={onTitleChange}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
