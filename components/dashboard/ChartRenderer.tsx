'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartConfig, ChartType } from '@/types/dashboard'
import { buildChartSeries } from '@/lib/dashboard/chart-data'

const COLORS = ['#0071E3', '#34C759', '#FF9500', '#FF3B30', '#86868B', '#5856D6']

export function ChartRenderer({
  chartType,
  config,
  series,
  rows,
}: {
  chartType: ChartType
  config: ChartConfig
  series?: Array<Record<string, string | number>>
  rows?: Array<Record<string, unknown>>
}) {
  const data =
    series ?? (rows ? buildChartSeries(rows, chartType, config) : [])

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-text-tertiary">
        Not enough data to render this chart.
      </div>
    )
  }

  if (chartType === 'stat') {
    const value = data[0]?.value ?? 0
    return (
      <div className="h-64 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-accent">{String(value)}</div>
        <div className="text-sm text-text-secondary mt-2">{data[0]?.name}</div>
      </div>
    )
  }

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
          <XAxis dataKey="x" type="number" />
          <YAxis dataKey="y" type="number" />
          <Tooltip />
          <Scatter data={data} fill="#0071E3" />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  const ChartComponent = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart
  const Series = chartType === 'line' ? Line : chartType === 'area' ? Area : Bar

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ChartComponent data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Series type="monotone" dataKey="value" stroke="#0071E3" fill="#0071E3" fillOpacity={chartType === 'area' ? 0.2 : 1} />
      </ChartComponent>
    </ResponsiveContainer>
  )
}
