import { NextResponse } from 'next/server'

import { createClient as createUserClient } from '@/lib/supabase/server'

import { createAdminClient } from '@/lib/supabase/admin'

import { parseCsvFile } from '@/lib/parsers/csv'

import { parseExcelFile } from '@/lib/parsers/excel'

import { buildSchemaFromRows } from '@/lib/parsers/schema'

import { buildEnrichedContext } from '@/lib/analytics/column-stats'
import { classifyDatasetType, datasetTypeLabel } from '@/lib/analytics/classify-dataset'
import { generateJsonArray } from '@/lib/gemini-generate'
import { buildScanPayload } from '@/lib/health/build-scan-payload'
import { detectStatIssues } from '@/lib/health/detect-stat-issues'

import {

  fallbackIssuesFromSchema,

  type HealthIssueInput,

  attachIssueMeta,

  extractIssueMeta,

} from '@/lib/health/fallback-issues'



export const runtime = 'nodejs'



type Body = {

  uploadId: string

  bucket?: string

}



function getExt(path: string) {

  const idx = path.lastIndexOf('.')

  return idx === -1 ? '' : path.slice(idx + 1).toLowerCase()

}



function normalizeAiIssue(raw: Record<string, unknown>): HealthIssueInput | null {

  const issue_type = typeof raw.issue_type === 'string' ? raw.issue_type : null

  const description = typeof raw.description === 'string' ? raw.description : null

  if (!issue_type || !description) return null



  const options = Array.isArray(raw.options)

    ? (raw.options as Array<Record<string, unknown>>)

        .map((o) => ({

          label: String(o.label ?? ''),

          action: String(o.action ?? 'keep_as_is'),

          value: o.value,

        }))

        .filter((o) => o.label && o.action)

    : [{ label: 'Keep as is', action: 'keep_as_is' }]



  return {

    issue_type,

    column_name: typeof raw.column_name === 'string' ? raw.column_name : null,

    description,

    affected_rows: Number(raw.affected_count ?? raw.affected_rows ?? 0) || 0,

    options,

    severity: ['low', 'medium', 'high', 'critical'].includes(String(raw.severity))

      ? (raw.severity as HealthIssueInput['severity'])

      : undefined,

    title: typeof raw.title === 'string' ? raw.title : undefined,

    impact: typeof raw.impact === 'string' ? raw.impact : undefined,

  }

}



export async function POST(request: Request) {

  try {

    const supabase = await createUserClient()

    const {

      data: { user },

    } = await supabase.auth.getUser()



    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })



    let body: Body

    try {

      body = (await request.json()) as Body

    } catch {

      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    }



    if (!body.uploadId) {

      return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })

    }



    const admin = createAdminClient()

    const { data: upload, error: uploadError } = await admin

      .from('uploads')

      .select('id, user_id, storage_path')

      .eq('id', body.uploadId)

      .eq('user_id', user.id)

      .single()



    if (uploadError || !upload) {

      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })

    }



    const bucket = body.bucket || 'uploads'

    const storagePath = upload.storage_path as string

    const ext = getExt(storagePath)

    if (!['csv', 'xlsx', 'xls'].includes(ext)) {

      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })

    }



    const { data: fileData, error: downloadError } = await admin.storage

      .from(bucket)

      .download(storagePath)



    if (downloadError || !fileData) {

      return NextResponse.json({ error: 'Failed to download file' }, { status: 400 })

    }



    const buffer = await fileData.arrayBuffer()



    let rows: Array<Record<string, unknown>> = []

    try {

      if (ext === 'csv') rows = await parseCsvFile(buffer)

      else rows = await parseExcelFile(buffer)

    } catch {

      return NextResponse.json({ error: 'Failed to parse file' }, { status: 400 })

    }



    const schema = buildSchemaFromRows(rows)

    const datasetType = classifyDatasetType(schema)

    const context = buildEnrichedContext(schema, rows, datasetTypeLabel(datasetType))



    let issues: HealthIssueInput[] = fallbackIssuesFromSchema(schema)

    let aiNotice: string | undefined



    try {

      const prompt = `You are a data quality engineer. Analyze this dataset schema and column statistics. Identify ALL quality issues.



Dataset type: ${datasetTypeLabel(datasetType)}

Metadata: ${JSON.stringify(context.metadata)}

Column stats: ${JSON.stringify(context.columnStats)}

Schema: ${JSON.stringify(schema)}



For each issue provide:

- issue_type: null_values | type_mismatch | duplicates | outlier | format_inconsistency | column_names

- severity: "low" | "medium" | "high" | "critical"

- column_name: affected column (or null for row-level issues)

- title: short issue title (max 8 words)

- description: one sentence a non-technical user can understand

- impact: one sentence explaining why this matters for analysis

- affected_count: number of rows or columns affected

- affected_percent: as a string e.g. "12.4%"

- options: array of [{label, action, description}] — 2-4 resolution choices

- recommended: index of the recommended option (0-based)



Severity guide:

- critical: >50% nulls, all duplicates, prevents analysis

- high: 20-50% nulls, major type issues, significant outliers

- medium: 5-20% nulls, format inconsistencies, minor outliers

- low: <5% nulls, cosmetic column name issues



Sort issues by severity descending.

Return ONLY a valid JSON array. No preamble. No markdown.`



      const { data, meta } = await generateJsonArray(prompt, {

        feature: 'health_scan',

        json: true,

        userId: user.id,

      })



      aiNotice = meta.notice



      const parsed = data

        .map((item) => normalizeAiIssue(item as Record<string, unknown>))

        .filter((i): i is HealthIssueInput => i !== null)



      if (parsed.length) issues = parsed

    } catch (aiError) {

      console.error('Health scan AI failed, using fallback:', aiError)

      aiNotice = 'AI scan unavailable — showing basic quality checks.'

    }



    const scanPayload = buildScanPayload(rows, schema.columns)
    const statIssues = detectStatIssues(scanPayload)
    const allIssues = [...issues, ...statIssues]

    await admin.from('health_issues').delete().eq('upload_id', upload.id)

    const rowsToInsert = allIssues.map((issue, idx) => ({

      upload_id: upload.id,

      issue_type: issue.issue_type,

      column_name: issue.column_name,

      description: issue.description,

      affected_rows: issue.affected_rows || (issue as any).affected_count || null,

      options: attachIssueMeta(issue.options, issue as any),

      resolved: false,

      order_index: idx,

    }))

    const [insertResult] = await Promise.all([
      admin
        .from('health_issues')
        .insert(rowsToInsert)
        .select(
          'id, issue_type, column_name, description, affected_rows, options, order_index'
        ),
      admin
        .from('uploads')
        .update({ computed_stats: scanPayload })
        .eq('id', upload.id)
    ])

    const { data: inserted, error: insertError } = insertResult



    if (insertError) {

      console.error('health_issues insert failed:', insertError)

      return NextResponse.json(

        { error: 'Failed to store issues', details: insertError.message },

        { status: 500 }

      )

    }



    const withMeta = (inserted ?? []).map((row) => {

      const meta = extractIssueMeta(row.options)

      const { options } = meta

      return { ...row, options, ...meta.fields }

    })



    return NextResponse.json({ issues: withMeta, aiNotice })

  } catch (err) {

    console.error('Health scan error:', err)

    const message = err instanceof Error ? err.message : 'Health scan failed'

    return NextResponse.json({ error: message }, { status: 500 })

  }

}


