import { buildEnrichedContext } from '@/lib/analytics/column-stats'
import { classifyDatasetType, datasetTypeLabel } from '@/lib/analytics/classify-dataset'
import { generateJsonObject, generateText, parseJsonObject } from '@/lib/gemini-generate'
import { fallbackDashboard } from '@/lib/dashboard/fallback-dashboard'
import { fixStatChartAggregations } from '@/lib/dashboard/stat-aggregation'
import { dedupeCharts, dropEmptyCharts, validateChart } from '@/lib/dashboard/validate-chart'
import { removeFlatCharts } from '@/lib/dashboard/chart-quality'
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

  const validated = dropEmptyCharts(dedupeCharts(charts), columns)
  const withoutFlat = removeFlatCharts(validated, rows, columns)
  return fixStatChartAggregations(withoutFlat, columns, rows)
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
  columnPairs?: string[]
  flatColumns?: string[]
}

async function runAnalysisPass(
  context: ReturnType<typeof buildEnrichedContext>,
  userId?: string
): Promise<AnalysisPass | null> {
  const prompt = `You are a senior data analyst. Analyze this dataset and answer:

1. What type of dataset is this? (sales, marketing, finance, HR, supply chain, health/wellness, other)
2. What are the 4 most important business questions this data can answer?
3. Which columns are the most analytically valuable and why?
4. Are there any interesting patterns, correlations, or anomalies visible in the stats?
5. What time granularity should be used if date columns exist? (daily/weekly/monthly)
6. Are there any column pairs that represent a "target vs actual" or "required vs consumed" or "budget vs spent" relationship? List them as "col_a vs col_b".
7. Looking at the column stats, which categorical columns have UNEVEN distributions (some categories much larger than others, good for charts) vs EVEN distributions (all categories nearly equal, would produce flat/useless charts)?

Dataset metadata: ${JSON.stringify(context.metadata)}
Column stats: ${JSON.stringify(context.columnStats)}

Respond in JSON only with keys:
- datasetType (string)
- keyQuestions (string array of 4)
- valuableColumns (string array)
- patterns (string)
- timeGranularity (string or null)
- columnPairs (string array of "col_a vs col_b" pairs, or empty array)
- flatColumns (string array of categorical columns that have nearly even distribution and would produce flat charts, or empty array)`

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
      columnPairs: Array.isArray(data.columnPairs)
        ? data.columnPairs.map(String)
        : undefined,
      flatColumns: Array.isArray(data.flatColumns)
        ? data.flatColumns.map(String)
        : undefined,
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
Column pairs (target vs actual): ${JSON.stringify(analysis?.columnPairs ?? [])}
Flat columns (avoid as xAxis for bar charts): ${JSON.stringify(analysis?.flatColumns ?? [])}
Schema: ${JSON.stringify(context.schema)}
Column stats: ${JSON.stringify(context.columnStats)}
Metadata: ${JSON.stringify(context.metadata)}

Generate a complete dashboard with:

1. title: short, specific dashboard title (not generic like "Data Dashboard")
2. ai_summary: EXACTLY 2 sentences:
   - Sentence 1: What is this data about?
   - Sentence 2: The single most important finding or takeaway.
3. ai_insights: [] (Always return an empty array)
4. charts: exactly 3 stat cards + exactly 4 other charts.
   - chart_type, title, description, xAxis, yAxis, aggregation
   - description: 1 short sentence max.

Chart generation rules:
- Generate exactly 3 stat cards and exactly 4 regular charts (7 total).
- Each regular chart must show something meaningfully different.
- If a date column exists: FIRST regular chart must be line or area (time series)

AGGREGATION RULES — CRITICAL, follow strictly for ALL chart types (stat, bar, pie, line, area, scatter):
- Every chart MUST include an "aggregation" field.
- Use "avg" for per-record metrics: scores, rates, prices, BMI, calories, temperature, satisfaction, percentages, ratios, indexes, any measurement per individual/row.
- Use "sum" ONLY for cumulative totals: total revenue, total quantity, total spend, total orders — columns where summing across rows makes business sense.
- Use "count" for stat cards showing number of records only (no yAxis needed).
- RULE OF THUMB: If the column represents something measured per person/item/record, use "avg". If summing all values together produces a meaningful business total, use "sum".
- NEVER use "sum" on columns like: BMI, height, weight, age, temperature, score, rating, price, cost_per, calories, intake, satisfaction, risk, rate, percent.
- NEVER use "sum" on a column whose values are between 0 and 1.

CHART QUALITY RULES — charts must provide insight:
- Do NOT create a bar chart where all category averages would be nearly equal. If a numeric column has similar values across all categories of the xAxis column, SKIP that combination and pick different columns.
- Prefer charts that reveal DIFFERENCES, TRENDS, or SURPRISING PATTERNS.
- Prefer xAxis columns from the "flatColumns" list LESS — those have even distributions that make flat/boring charts.
- Chart titles should communicate the INSIGHT, not just the axes. Examples:
  BAD: "Caloric Intake by Health Status"
  GOOD: "Obese Individuals Consume 27% More Calories on Average"
  BAD: "Average BMI by Diet Type"
  GOOD: "BMI Is Nearly Identical Across All Diet Types"
- If column pairs exist (target vs actual, required vs consumed), create a comparison chart showing the gap/difference.

Stat card rules:
- Use aggregation "avg" for: risk scores, percentages, rates, satisfaction scores, performance scores, any column where values are between 0–1 or 0–100, or titles containing "average"/"mean", or any per-person measurement like BMI, calories, etc.
- Use aggregation "sum" for: total salary, total revenue, total quantity, total spend — only when the title implies a total
- Use aggregation "count" for row-count stat cards only (no yAxis)

Chart type rules:
- Bar charts: xAxis must be a categorical column with 2–20 unique values
- Line/area charts: xAxis must be the date column only
- Pie charts: only if xAxis column has 2–6 unique values, never more
- Scatter: only if two numeric columns have a meaningful relationship
- DO NOT include groupBy in any chart — omit that field entirely
- DO NOT use ID columns, index columns, or free-text columns as xAxis
- yAxis must always be a numeric column for bar/line/area/scatter
- Sort preference: most impactful/interesting charts first
- Use only column names from the schema

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
