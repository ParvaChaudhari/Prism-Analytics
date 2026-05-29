import { generateText, parseJsonObject } from '@/lib/gemini-generate'
import { fallbackDashboard } from '@/lib/dashboard/fallback-dashboard'
import type { DatasetSchema } from '@/lib/parsers/schema'
import type { DashboardPayload, GeneratedChart, Insight } from '@/types/dashboard'

const MAX_SAMPLE_ROWS = 200

export function normalizePayload(raw: Record<string, unknown>): DashboardPayload | null {
  const title = typeof raw.title === 'string' ? raw.title : null
  const ai_summary = typeof raw.ai_summary === 'string' ? raw.ai_summary : null
  const ai_insights = raw.ai_insights
  const charts = raw.charts

  if (!title || !ai_summary || !Array.isArray(charts)) return null

  const insights: Insight[] = (ai_insights as unknown[]).map((item) => {
    const o = item as Record<string, unknown>
    const type = o.type as Insight['type']
    return {
      title: String(o.title ?? ''),
      description: String(o.description ?? ''),
      type: ['positive', 'negative', 'neutral', 'warning'].includes(type) ? type : 'neutral',
    }
  })

  const normalizedCharts: GeneratedChart[] = charts.map((item) => {
    const c = item as Record<string, unknown>
    const chart_type = c.chart_type as GeneratedChart['chart_type']
    return {
      chart_type: ['bar', 'line', 'area', 'pie', 'scatter', 'stat'].includes(chart_type)
        ? chart_type
        : 'bar',
      title: String(c.title ?? 'Chart'),
      description: String(c.description ?? ''),
      xAxis: c.xAxis ? String(c.xAxis) : undefined,
      yAxis: c.yAxis ? String(c.yAxis) : undefined,
      groupBy: c.groupBy ? String(c.groupBy) : undefined,
      aggregation: c.aggregation as GeneratedChart['aggregation'],
    }
  })

  return { title, ai_summary, ai_insights: insights, charts: normalizedCharts }
}

export async function generateAiPayload(
  schema: DatasetSchema,
  rows: Array<Record<string, unknown>>
): Promise<DashboardPayload> {
  let payload = fallbackDashboard(schema)

  try {
    const sample = rows.slice(0, MAX_SAMPLE_ROWS)
    const prompt = `You are a senior data analyst. Given this cleaned dataset schema and up to 200 sample rows, generate a complete dashboard configuration.

Return a single JSON object with:
- title: short dashboard title based on the data
- ai_summary: 3-4 sentence executive summary — key trends, notable findings, and one actionable insight
- ai_insights: array of [{title, description, type}] where type is positive | negative | neutral | warning
- charts: array of [{chart_type, title, description, xAxis, yAxis, groupBy, aggregation}]
  - chart_type: one of [bar, line, area, pie, scatter, stat]
  - description: one sentence explaining what this chart reveals
  - Mix chart types. Choose what reveals the most meaningful patterns.
  - Use only column names that exist in the schema.

Return ONLY valid JSON. No preamble, no markdown fences.

Schema:
${JSON.stringify(schema)}

Sample rows:
${JSON.stringify(sample)}`

    const text = await generateText(prompt)
    const parsed = parseJsonObject(text)
    const normalized = parsed ? normalizePayload(parsed) : null
    if (normalized) payload = normalized
  } catch (aiError) {
    console.error('Dashboard AI failed, using fallback:', aiError)
  }

  return payload
}
