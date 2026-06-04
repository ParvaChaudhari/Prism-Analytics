import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateJsonArray } from '@/lib/gemini-generate'
import { buildSchemaFromRows } from '@/lib/parsers/schema'
import type { Insight } from '@/types/dashboard'

export const runtime = 'nodejs'
export const maxDuration = 60

type Body = {
  datasetIdA: string
  datasetIdB: string
}

const MAX_SAMPLE = 100

async function loadDataset(admin: ReturnType<typeof createAdminClient>, id: string, userId: string) {
  const { data, error } = await admin
    .from('datasets')
    .select('id, cleaned_data, raw_schema, row_count, uploads(original_filename)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  const rows = (data.cleaned_data as Array<Record<string, unknown>>) ?? []
  const schema =
    (data.raw_schema as ReturnType<typeof buildSchemaFromRows>) ?? buildSchemaFromRows(rows)
  const upload = data.uploads as { original_filename?: string } | null

  return {
    id: data.id,
    name: upload?.original_filename ?? 'Dataset',
    rowCount: data.row_count as number,
    schema,
    sample: rows.slice(0, MAX_SAMPLE),
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
    if (!body.datasetIdA || !body.datasetIdB) {
      return NextResponse.json({ error: 'Missing dataset IDs' }, { status: 400 })
    }

    if (body.datasetIdA === body.datasetIdB) {
      return NextResponse.json({ error: 'Choose two different datasets' }, { status: 400 })
    }

    const admin = createAdminClient()
    const [a, b] = await Promise.all([
      loadDataset(admin, body.datasetIdA, user.id),
      loadDataset(admin, body.datasetIdB, user.id),
    ])

    if (!a || !b) {
      return NextResponse.json({ error: 'One or both datasets not found' }, { status: 404 })
    }

    const prompt = `You are a data analyst comparing two datasets.

Dataset A ("${a.name}"): ${a.rowCount} rows
Schema A: ${JSON.stringify(a.schema)}
Sample A: ${JSON.stringify(a.sample)}

Dataset B ("${b.name}"): ${b.rowCount} rows
Schema B: ${JSON.stringify(b.schema)}
Sample B: ${JSON.stringify(b.sample)}

Identify meaningful differences: schema changes, row count shifts, value distribution changes, new/missing columns, trends.

Return ONLY a JSON array of objects with:
- title: short headline
- description: one sentence explanation
- type: one of [positive, negative, neutral, warning]

Return 4-8 insights. No markdown, no preamble.`

    const { data, meta } = await generateJsonArray(prompt, {
      feature: 'compare',
      json: true,
      userId: user.id,
    })
    let insights: Insight[] = (data as Insight[]) ?? []

    if (!insights.length) {
      insights = [
        {
          title: 'Row count difference',
          description: `Dataset A has ${a.rowCount} rows; Dataset B has ${b.rowCount} rows.`,
          type: 'neutral',
        },
        {
          title: 'Column count',
          description: `Dataset A has ${a.schema.columns.length} columns; Dataset B has ${b.schema.columns.length} columns.`,
          type: 'neutral',
        },
      ]
    }

    return NextResponse.json({
      datasetA: { id: a.id, name: a.name, rowCount: a.rowCount },
      datasetB: { id: b.id, name: b.name, rowCount: b.rowCount },
      insights,
      aiNotice: meta.notice,
    })
  } catch (err) {
    console.error('Compare error:', err)
    return NextResponse.json({ error: 'Comparison failed' }, { status: 500 })
  }
}
