import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseCsvFile } from '@/lib/parsers/csv'
import { parseExcelFile } from '@/lib/parsers/excel'
import { buildSchemaFromRows } from '@/lib/parsers/schema'
import { generateText, parseJsonArray } from '@/lib/gemini-generate'
import {
  fallbackIssuesFromSchema,
  type HealthIssueInput,
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

    let issues: HealthIssueInput[] = fallbackIssuesFromSchema(schema)

    try {
      const prompt = `You are a data quality analyst. Given this dataset schema (column names, inferred types, null counts, unique counts, and sample values), identify all data quality issues.

For each issue return:
- issue_type: one of [null_values, mixed_types, duplicate_rows, format_mismatch, fuzzy_duplicate, outlier]
- column_name: affected column (null if row-level)
- description: plain English explanation a non-technical user can understand in one sentence
- affected_rows: estimated count
- options: array of [{label, action, value}] resolution choices to show the user

Return ONLY a valid JSON array of issues. No preamble, no markdown, no explanation.

Schema JSON:
${JSON.stringify(schema)}`

      const text = await generateText(prompt)
      const parsed = parseJsonArray(text)
      if (parsed?.length) {
        issues = parsed as HealthIssueInput[]
      }
    } catch (aiError) {
      console.error('Health scan AI failed, using fallback:', aiError)
    }

    await admin.from('health_issues').delete().eq('upload_id', upload.id)

    const rowsToInsert = issues.map((issue, idx) => ({
      upload_id: upload.id,
      issue_type: issue.issue_type,
      column_name: issue.column_name,
      description: issue.description,
      affected_rows: issue.affected_rows,
      options: issue.options,
      resolved: false,
      order_index: idx,
    }))

    const { data: inserted, error: insertError } = await admin
      .from('health_issues')
      .insert(rowsToInsert)
      .select(
        'id, issue_type, column_name, description, affected_rows, options, order_index'
      )

    if (insertError) {
      console.error('health_issues insert failed:', insertError)
      return NextResponse.json(
        { error: 'Failed to store issues', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ issues: inserted ?? [] })
  } catch (err) {
    console.error('Health scan error:', err)
    const message = err instanceof Error ? err.message : 'Health scan failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
