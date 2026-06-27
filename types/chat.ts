import type { ChartDataPoint, ChartType } from '@/types/dashboard'

export type ChatRole = 'user' | 'assistant'

export type AttachedChart = {
  id: string
  title: string
  chartType: ChartType
  data: ChartDataPoint[]
}

export type ChatMessage = {
  role: ChatRole
  content: string
  timestamp: string
  attachedChart?: AttachedChart
}

export const CHART_STARTER_QUESTIONS = [
  'What is the highest value in this chart?',
  'What trend does this chart show?',
  'Which category dominates?',
  'Are there any anomalies in this data?',
]
