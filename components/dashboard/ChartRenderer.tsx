'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { formatStatValue } from '@/lib/dashboard/format-stat'

const COLORS = ['#000000', '#005ab7', '#0372e4', '#8E2DE2', '#6E6E73', '#4A90E2']

function seriesKeysFromData(data: Array<Record<string, string | number>>): string[] {
  if (!data.length) return ['value']
  const first = data[0]
  if ('value' in first && typeof first.value === 'number') return ['value']
  return Object.keys(first).filter((k) => k !== 'name')
}

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
  const data = series ?? (rows ? buildChartSeries(rows, chartType, config) : [])

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
        <div className="text-4xl font-bold text-primary">{formatStatValue(Number(value), config?.yAxis ?? '')}</div>
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
          <Tooltip formatter={(v) => (typeof v === 'number' ? v.toLocaleString() : String(v))} />
          <Legend />
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
          <Scatter data={data} fill="#005ab7" />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  const keys = seriesKeysFromData(data)
  const isMulti = keys.length > 1 || (keys.length === 1 && keys[0] !== 'value')

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} interval="preserveStartEnd" height={60} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {isMulti ? <Legend /> : null}
          {keys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} interval="preserveStartEnd" height={60} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {isMulti ? <Legend /> : null}
          {keys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId={isMulti ? 'stack' : undefined}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          interval={0}
          angle={keys.length === 1 ? -20 : 0}
          textAnchor={keys.length === 1 ? 'end' : 'middle'}
          height={60}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        {isMulti ? <Legend /> : null}
        {keys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
