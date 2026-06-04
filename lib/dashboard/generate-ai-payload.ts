import { buildEnrichedContext } from '@/lib/analytics/column-stats'
import { classifyDatasetType, datasetTypeLabel } from '@/lib/analytics/classify-dataset'
import { generateJsonObject, generateText, parseJsonObject } from '@/lib/gemini-generate'
import { fallbackDashboard } from '@/lib/dashboard/fallback-dashboard'
import { fixStatChartAggregations } from '@/lib/dashboard/stat-aggregation'
import { dedupeCharts, dropEmptyCharts, validateChart } from '@/lib/dashboard/validate-chart'
import type { DatasetSchema } from '@/lib/parsers/schema'
import type { DashboardPayload, GeneratedChart, Insight } from '@/types/dashboard'

export type GenerateAiResult = DashboardPayload & {
  aiNotice?: string
  modelUsed?: string
}

function normalizeInsights(raw: unknown): Insight[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const o = item as Record<string, unknown>
    const type = o.type as Insight['type']
    return {
      title: String(o.title ?? ''),
      description: String(o.description ?? ''),
      type: ['positive', 'negative', 'neutral', 'warning'].includes(type) ? type : 'neutral',
    }
  })
}

function normalizeCharts(
  raw: unknown,
  columns: DatasetSchema['columns'],
  rows: Array<Record<string, unknown>>,
  rowCount: number
): GeneratedChart[] {
  if (!Array.isArray(raw)) return []

  const charts: GeneratedChart[] = []
  for (const item of raw) {
    const c = item as Record<string, unknown>
    const chart_type = c.chart_type as GeneratedChart['chart_type']
    const candidate: GeneratedChart = {
      chart_type: ['bar', 'line', 'area', 'pie', 'scatter', 'stat'].includes(chart_type)
        ? chart_type
        : 'bar',
      title: String(c.title ?? 'Chart'),
      description: String(c.description ?? ''),
      xAxis: c.xAxis ? String(c.xAxis) : undefined,
      yAxis: c.yAxis ? String(c.yAxis) : undefined,
      aggregation: c.aggregation as GeneratedChart['aggregation'],
    }
    const valid = validateChart(candidate, columns, rows, rowCount)
    if (valid) charts.push(valid)
  }

  return fixStatChartAggregations(
    dropEmptyCharts(dedupeCharts(charts), columns),
    columns,
    rows
  )
}

function normalizePayload(
  raw: Record<string, unknown>,
  columns: DatasetSchema['columns'],
  rows: Array<Record<string, unknown>>,
  rowCount: number
): DashboardPayload | null {
  const title = typeof raw.title === 'string' ? raw.title : null
  const ai_summary = typeof raw.ai_summary === 'string' ? raw.ai_summary : null
  if (!title || !ai_summary) return null

  const charts = normalizeCharts(raw.charts, columns, rows, rowCount)
  if (!charts.length) return null

  return {
    title,
    ai_summary,
    ai_insights: normalizeInsights(raw.ai_insights),
    charts,
  }
}

type AnalysisPass = {
  datasetType?: string
  keyQuestions?: string[]
  valuableColumns?: string[]
  patterns?: string
  timeGranularity?: string
}

async function runAnalysisPass(
  context: ReturnType<typeof buildEnrichedContext>,
  userId?: string
): Promise<AnalysisPass | null> {
  const prompt = `You are a senior data analyst. Analyze this dataset and answer:

1. What type of dataset is this? (sales, marketing, finance, HR, supply chain, other)
2. What are the 4 most important business questions this data can answer?
3. Which columns are the most analytically valuable and why?
4. Are there any interesting patterns, correlations, or anomalies visible in the stats?
5. What time granularity should be used if date columns exist? (daily/weekly/monthly)

Dataset metadata: ${JSON.stringify(context.metadata)}
Column stats: ${JSON.stringify(context.columnStats)}

Respond in JSON only with keys:
- datasetType (string)
- keyQuestions (string array of 4)
- valuableColumns (string array)
- patterns (string)
- timeGranularity (string or null)`

  try {
    const { data } = await generateJsonObject(prompt, {
      feature: 'dashboard_analysis',
      json: true,
      userId,
    })
    return {
      datasetType: typeof data.datasetType === 'string' ? data.datasetType : undefined,
      keyQuestions: Array.isArray(data.keyQuestions)
        ? data.keyQuestions.map(String).slice(0, 4)
        : undefined,
      valuableColumns: Array.isArray(data.valuableColumns)
        ? data.valuableColumns.map(String)
        : undefined,
      patterns: typeof data.patterns === 'string' ? data.patterns : undefined,
      timeGranularity:
        typeof data.timeGranularity === 'string' ? data.timeGranularity : undefined,
    }
  } catch {
    return null
  }
}

async function runGenerationPass(
  context: ReturnType<typeof buildEnrichedContext>,
  analysis: AnalysisPass | null,
  rows: Array<Record<string, unknown>>,
  userId?: string
): Promise<{ payload: DashboardPayload | null; notice?: string; modelUsed?: string }> {
  const domain = analysis?.datasetType ?? datasetTypeLabel(classifyDatasetType(context.schema))

  const prompt = `You are a senior data analyst building an executive dashboard.

Dataset type: ${domain}
Key questions this dashboard should answer: ${JSON.stringify(analysis?.keyQuestions ?? [])}
Most valuable columns: ${JSON.stringify(analysis?.valuableColumns ?? [])}
Patterns noted: ${analysis?.patterns ?? 'none'}
Time granularity: ${analysis?.timeGranularity ?? 'auto'}
Schema: ${JSON.stringify(context.schema)}
Column stats: ${JSON.stringify(context.columnStats)}
Metadata: ${JSON.stringify(context.metadata)}

Generate a complete dashboard with:

1. title: short, specific dashboard title (not generic like "Data Dashboard")
2. ai_summary: exactly 4 sentences:
   - Sentence 1: What is this data about and what time period does it cover
   - Sentence 2: The single most important trend or finding
   - Sentence 3: A secondary notable pattern or anomaly
   - Sentence 4: One specific actionable recommendation
3. ai_insights: array of 4-6 insight objects [{title, description, type}]
   - type: "positive" | "negative" | "neutral" | "warning"
4. charts: array of 5-8 charts [{chart_type, title, description, xAxis, yAxis, aggregation}]

Chart generation rules:
- Generate 5–8 charts total
- If a date column exists: FIRST chart must be line or area (time series)
- Always include 2–3 stat cards for the most important numeric columns

Stat card aggregation rules (critical):
- Use aggregation "avg" for: risk scores, percentages, rates, satisfaction scores, performance scores, any column where values are between 0–1 or 0–100, or titles containing "average"/"mean"
- Use aggregation "sum" for: total salary, total revenue, total quantity, total spend — only when the title implies a total
- Use aggregation "count" for row-count stat cards only (no yAxis)
- Never use "sum" on a column whose values are decimals between 0 and 1 (e.g. risk index 0.50)

- Bar charts: xAxis must be a categorical column with 2–20 unique values
- Line/area charts: xAxis must be the date column only
- Pie charts: only if xAxis column has 2–6 unique values, never more
- Scatter: only if two numeric columns have a meaningful relationship
- DO NOT include groupBy in any chart — omit that field entirely
- DO NOT use ID columns, index columns, or free-text columns as xAxis
- yAxis must always be a numeric column for bar/line/area/scatter
- Sort preference: most impactful/interesting charts first
- Use only column names from the schema

Aggregation rules — follow strictly:
- Use "avg" for: risk scores, performance scores, satisfaction scores, demand scores, any column where values are between 0–1 or 0–100, growth rates, ratios, indexes
- Use "sum" for: salary totals, revenue, quantity, count-based columns
- Use "count" for: stat cards showing number of records only
- NEVER use "sum" on a column whose values are between 0 and 1
- NEVER use "sum" on columns named: risk, score, rate, ratio, index, satisfaction, performance, demand, growth, percent, pct

Return ONLY valid JSON. No markdown. No explanation.
First character must be { and last must be }`

  const { data, meta } = await generateJsonObject(prompt, {
    feature: 'dashboard_generation',
    json: true,
    userId,
  })

  return {
    payload: normalizePayload(data, context.schema.columns, rows, context.schema.rowCount),
    notice: meta.notice,
    modelUsed: meta.modelUsed,
  }
}

function applyTimeGranularity(
  charts: GeneratedChart[],
  granularity?: string
): GeneratedChart[] {
  if (!granularity || granularity === 'auto') return charts
  return charts.map((chart) => {
    if (chart.chart_type === 'line' || chart.chart_type === 'area') {
      return { ...chart, granularity }
    }
    return chart
  })
}

function buildValidatedFallback(
  schema: DatasetSchema,
  rows: Array<Record<string, unknown>>,
  granularity?: string
): DashboardPayload {
  const base = fallbackDashboard(schema, rows)
  const charts = dropEmptyCharts(
    base.charts
      .map((chart) => validateChart(chart, schema.columns, rows, schema.rowCount))
      .filter((c): c is GeneratedChart => c !== null),
    schema.columns
  )
  return {
    ...base,
    charts: applyTimeGranularity(
      fixStatChartAggregations(charts, schema.columns, rows),
      granularity
    ),
  }
}

export async function generateAiPayload(
  schema: DatasetSchema,
  rows: Array<Record<string, unknown>>,
  userId?: string,
  computedStats?: any
): Promise<GenerateAiResult> {
  const datasetType = classifyDatasetType(schema)
  const context = buildEnrichedContext(schema, rows, datasetTypeLabel(datasetType))
  
  if (computedStats && computedStats.columns) {
    context.columnStats = computedStats.columns
  }

  let aiNotice: string | undefined
  let modelUsed: string | undefined

  let analysis: AnalysisPass | null = null

  try {
    analysis = await runAnalysisPass(context, userId)
    const generation = await runGenerationPass(context, analysis, rows, userId)

    if (generation.payload) {
      const payload: DashboardPayload = {
        ...generation.payload,
        charts: applyTimeGranularity(
          generation.payload.charts,
          analysis?.timeGranularity
        ),
      }
      return { ...payload, aiNotice: generation.notice, modelUsed: generation.modelUsed }
    }

    aiNotice = generation.notice ?? 'AI returned no valid charts — using rule-based dashboard.'
  } catch (aiError) {
    console.error('Dashboard AI failed, using fallback:', aiError)
    aiNotice = 'AI generation failed — showing a basic dashboard. Try regenerating.'
  }

  const payload = buildValidatedFallback(schema, rows, analysis?.timeGranularity)
  return { ...payload, aiNotice, modelUsed }
}

/** Legacy helper for routes that still call generateText directly */
export { parseJsonObject, generateText }
