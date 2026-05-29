export type InsightType = 'positive' | 'negative' | 'neutral' | 'warning'

export type Insight = {
  title: string
  description: string
  type: InsightType
}

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stat'

export type ChartConfig = {
  xAxis?: string
  yAxis?: string
  groupBy?: string
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none'
  description?: string
}

export type GeneratedChart = {
  chart_type: ChartType
  title: string
  description: string
  xAxis?: string
  yAxis?: string
  groupBy?: string
  aggregation?: ChartConfig['aggregation']
}

export type DashboardPayload = {
  title: string
  ai_summary: string
  ai_insights: Insight[]
  charts: GeneratedChart[]
}

export type StoredChart = {
  id: string
  title: string
  chart_type: ChartType
  config: ChartConfig
  position?: { x: number; y: number; w: number; h: number }
}

export type StoredDashboard = {
  id: string
  title: string
  ai_summary: string
  ai_insights: Insight[]
  dataset_id: string
}
