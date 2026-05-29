import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateText, parseJsonObject } from '@/lib/gemini-generate'
import { getDashboardForDataset } from '@/lib/dashboard/get-dashboard'
import { buildSchemaFromRows } from '@/lib/parsers/schema'
import type { ChartType, GeneratedChart } from '@/types/dashboard'

export const runtime = 'nodejs'

type Body = {
  datasetId: string
  prompt: string
}

function normalizeChart(raw: Record<string, unknown>, columns: string[]): GeneratedChart | null {
  const chart_type = raw.chart_type as ChartType
  const title = typeof raw.title === 'string' ? raw.title : null
  if (!title) return null

  const xAxis = raw.xAxis ? String(raw.xAxis) : undefined
  const yAxis = raw.yAxis ? String(raw.yAxis) : undefined

  if (xAxis && !columns.includes(xAxis)) return null
  if (yAxis && !columns.includes(yAxis)) return null

  return {
    chart_type: ['bar', 'line', 'area', 'pie', 'scatter', 'stat'].includes(chart_type)
      ? chart_type
      : 'bar',
    title,
    description: String(raw.description ?? ''),
    xAxis,
    yAxis,
    groupBy: raw.groupBy ? String(raw.groupBy) : undefined,
    aggregation: raw.aggregation as GeneratedChart['aggregation'],
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createUserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json()) as Body
    if (!body.datasetId || !body.prompt?.trim()) {
      return NextResponse.json({ error: 'Missing datasetId or prompt' }, { status: 400 })
    }

    const admin = createAdminClient()
    const result = await getDashboardForDataset(admin, body.datasetId, user.id)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    const rows = (result.dataset.cleaned_data as Array<Record<string, unknown>>) ?? []
    const schema =
      (result.dataset.raw_schema as ReturnType<typeof buildSchemaFromRows>) ??
      buildSchemaFromRows(rows)
    const columns = schema.columns.map((c) => c.name)

    const prompt = `You convert natural language chart requests into chart configuration JSON.

Available columns: ${JSON.stringify(columns)}

User request: "${body.prompt.trim()}"

Return a single JSON object with:
- chart_type: one of [bar, line, area, pie, scatter, stat]
- title: short chart title
- description: one sentence
- xAxis: column name (optional for stat)
- yAxis: column name (optional for pie/count)
- groupBy: optional column name
- aggregation: one of [sum, avg, count, min, max, none]

Use only column names from the available columns list.
Return ONLY valid JSON. No markdown.`

    const text = await generateText(prompt)
    const parsed = parseJsonObject(text)
    if (!parsed) {
      return NextResponse.json({ error: 'AI could not parse that request' }, { status: 400 })
    }

    const chart = normalizeChart(parsed, columns)
    if (!chart) {
      return NextResponse.json({ error: 'Invalid chart configuration from AI' }, { status: 400 })
    }

    return NextResponse.json({ chart })
  } catch (err) {
    console.error('nl-to-chart error:', err)
    return NextResponse.json({ error: 'Failed to parse chart request' }, { status: 500 })
  }
}
