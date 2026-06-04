import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateText } from '@/lib/gemini-generate'
import { buildSchemaFromRows } from '@/lib/parsers/schema'

export const runtime = 'nodejs'
export const maxDuration = 60

type Body = { dashboardId: string }

const MAX_SAMPLE = 150

export async function POST(request: Request) {
  try {
    const supabase = await createUserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json()) as Body
    if (!body.dashboardId) {
      return NextResponse.json({ error: 'Missing dashboardId' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: dashboard, error } = await admin
      .from('dashboards')
      .select('id, title, ai_summary, ai_insights, dataset_id')
      .eq('id', body.dashboardId)
      .eq('user_id', user.id)
      .single()

    if (error || !dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    const { data: dataset } = await admin
      .from('datasets')
      .select('cleaned_data, raw_schema, row_count, uploads(original_filename)')
      .eq('id', dashboard.dataset_id)
      .eq('user_id', user.id)
      .single()

    const rows = (dataset?.cleaned_data as Array<Record<string, unknown>>) ?? []
    const schema =
      (dataset?.raw_schema as ReturnType<typeof buildSchemaFromRows>) ??
      buildSchemaFromRows(rows)
    const upload = dataset?.uploads as { original_filename?: string } | null

    const prompt = `You are a senior data storyteller. Write a compelling narrative report about this dataset for a non-technical executive audience.

Dataset: ${upload?.original_filename ?? dashboard.title}
Rows: ${dataset?.row_count ?? rows.length}
Schema: ${JSON.stringify(schema)}
Sample rows: ${JSON.stringify(rows.slice(0, MAX_SAMPLE))}
Dashboard summary already shown: ${dashboard.ai_summary}
Key insights: ${JSON.stringify(dashboard.ai_insights)}

Write a markdown report with:
- A compelling title as # heading
- 3-5 sections with ## headings
- Short paragraphs, bullet points where helpful
- Actionable conclusion

Use only facts from the data provided. Do not invent numbers.`

    const result = await generateText(prompt, { feature: 'story', userId: user.id })

    return NextResponse.json({ story: result.text, aiNotice: result.notice })
  } catch (err) {
    console.error('Story error:', err)
    return NextResponse.json({ error: 'Failed to generate story' }, { status: 500 })
  }
}
