'use client'

import { ChartCard } from '@/components/dashboard/ChartCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { ChartConfig, ChartType, ChartDataPoint } from '@/types/dashboard'

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
  onAskAboutChart,
}: {
  charts: ChartItem[]
  chartData: Record<string, ChartDataPoint[]>
  chartsLoading?: boolean
  onDelete?: (id: string) => void
  onTitleChange?: (id: string, title: string) => void
  onAskAboutChart?: (chartId: string) => void
}) {
  const statCharts = charts.filter((c) => c.chart_type === 'stat')
  const regularCharts = charts.filter((c) => c.chart_type !== 'stat')
  const topCharts = regularCharts.slice(0, 2)
  const bottomCharts = regularCharts.slice(2)

  const renderCard = (chart: ChartItem, extraClasses = '', tall?: boolean) => {
    const series = chartData[chart.id]
    const loadingChart = chartsLoading && !series
    return loadingChart ? (
      <Skeleton key={chart.id} className={`rounded-xl ${chart.chart_type === 'stat' ? 'h-24' : 'h-[300px]'} ${extraClasses}`} />
    ) : (
      <div key={chart.id} className={extraClasses}>
        <ErrorBoundary>
          <ChartCard
            id={chart.id}
            title={chart.title}
            chartType={chart.chart_type}
            config={chart.config}
            series={series}
            isManual={chart.is_manual}
            onDelete={onDelete}
            onTitleChange={onTitleChange}
            onAskAboutChart={onAskAboutChart}
            tall={tall}
          />
        </ErrorBoundary>
      </div>
    )
  }

  if (chartsLoading && !charts.length) {
    return (
      <div className="flex flex-col xl:grid xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-7 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="flex-1 min-h-[260px] rounded-xl" />
        </div>
        <div className="xl:col-span-5 flex flex-col gap-4">
          <Skeleton className="flex-1 h-full min-h-[300px] rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col xl:grid xl:grid-cols-12 gap-4 items-stretch">
      {/* Left Block: Metrics + Chart 1 */}
      <div className={`flex flex-col gap-4 ${regularCharts.length > 1 ? 'xl:col-span-7' : 'xl:col-span-12'}`}>
        {statCharts.length > 0 && (
          <div className={`grid gap-4 ${statCharts.length === 1 ? 'grid-cols-1' : statCharts.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            {statCharts.map(c => renderCard(c))}
          </div>
        )}
        {regularCharts.length > 0 && (
          <div className="flex-1 flex flex-col min-h-[260px]">
            {renderCard(regularCharts[0], 'flex-1 flex flex-col h-full')}
          </div>
        )}
      </div>

      {/* Right Block: Chart 2 */}
      {regularCharts.length > 1 && (
        <div className="xl:col-span-5 flex flex-col gap-4">
          {renderCard(regularCharts[1], 'flex-1 flex flex-col h-full min-h-[300px]', true)}
        </div>
      )}

      {/* Bottom Block: Remaining charts */}
      {regularCharts.length > 2 && (
        <div className="xl:col-span-12 grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-4 mt-2">
          {regularCharts.slice(2).map(c => renderCard(c, 'flex flex-col h-[260px]'))}
        </div>
      )}
    </div>
  )
}
