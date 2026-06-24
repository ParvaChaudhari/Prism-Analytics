import { z } from 'zod'

export const ChartAggregationSchema = z.enum(['count', 'sum', 'avg', 'min', 'max'])
export const ChartTypeSchema = z.enum(['bar', 'line', 'area', 'pie', 'scatter', 'stat'])
export const InsightTypeSchema = z.enum(['positive', 'negative', 'neutral', 'warning'])

export const GeneratedChartSchema = z.object({
  title: z.string(),
  description: z.string(),
  chart_type: ChartTypeSchema,
  xAxis: z.string().optional(),
  yAxis: z.string().optional(),
  aggregation: ChartAggregationSchema.optional(),
})

export const InsightSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: InsightTypeSchema,
})

export const DashboardPayloadSchema = z.object({
  title: z.string(),
  ai_summary: z.string(),
  ai_insights: z.array(InsightSchema),
  charts: z.array(GeneratedChartSchema),
})

export type ZodDashboardPayload = z.infer<typeof DashboardPayloadSchema>
