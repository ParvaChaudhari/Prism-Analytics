import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseCsvFile } from '@/lib/parsers/csv'
import { parseExcelFile } from '@/lib/parsers/excel'
import { buildSchemaFromRows } from '@/lib/parsers/schema'

export const runtime = 'nodejs'

type Resolution = {
  issueId: string
  action: string
  value?: unknown
}

type Body = {
  uploadId: string
  bucket?: string
  resolutions: Resolution[]
}

function getExt(path: string) {
  const idx = path.lastIndexOf('.')
  return idx === -1 ? '' : path.slice(idx + 1).toLowerCase()
}

function isNullish(v: unknown) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

function applyResolutions(
  inputRows: Array<Record<string, unknown>>,
  resolutions: Array<{ action: string; column?: string | null; value?: unknown }>
) {
  let rows = inputRows

  for (const r of resolutions) {
    const action = r.action
    const column = r.column ?? null

    if (action === 'keep_as_is') continue

    if (action === 'drop_rows_with_nulls' && column) {
      rows = rows.filter((row) => !isNullish(row[column]))
      continue
    }

    if (action === 'fill_nulls' && column) {
      rows = rows.map((row) => {
        if (!isNullish(row[column])) return row
        return { ...row, [column]: r.value ?? '' }
      })
      continue
    }

    if (action === 'trim_strings') {
      rows = rows.map((row) => {
        const next: Record<string, unknown> = { ...row }
        for (const [k, v] of Object.entries(next)) {
          if (typeof v === 'string') next[k] = v.trim()
        }
        return next
      })
      continue
    }

    if (action === 'dedupe_rows') {
      const seen = new Set<string>()
      rows = rows.filter((row) => {
        const key = JSON.stringify(row)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      continue
    }
  }

  return rows
}

export async function POST(request: Request) {
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

  if (!body.uploadId) return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })
  if (!Array.isArray(body.resolutions))
    return NextResponse.json({ error: 'Missing resolutions' }, { status: 400 })

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

  const { data: issueRows, error: issuesError } = await admin
    .from('health_issues')
    .select('id, column_name')
    .eq('upload_id', upload.id)

  if (issuesError) {
    return NextResponse.json({ error: 'Failed to load issues' }, { status: 500 })
  }

  const issueIdToColumn = new Map<string, string | null>()
  for (const issue of issueRows || []) {
    issueIdToColumn.set(issue.id as string, (issue.column_name as string | null) ?? null)
  }

  // Persist resolutions onto issues
  for (const r of body.resolutions) {
    await admin
      .from('health_issues')
      .update({ resolution: { action: r.action, value: r.value }, resolved: true })
      .eq('id', r.issueId)
      .eq('upload_id', upload.id)
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
  let rawRows: Array<Record<string, unknown>> = []
  try {
    if (ext === 'csv') rawRows = await parseCsvFile(buffer)
    else rawRows = await parseExcelFile(buffer)
  } catch {
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 400 })
  }

  const resolved = body.resolutions.map((r) => ({
    action: r.action,
    value: r.value,
    column: issueIdToColumn.get(r.issueId) ?? null,
  }))

  const cleanedRows = applyResolutions(rawRows, resolved)
  const rawSchema = buildSchemaFromRows(rawRows)

  const { data: datasetRow, error: datasetError } = await admin
    .from('datasets')
    .insert({
      upload_id: upload.id,
      user_id: user.id,
      raw_schema: rawSchema,
      cleaned_data: cleanedRows,
      transform_log: resolved,
      row_count: cleanedRows.length,
    })
    .select('id')
    .single()

  if (datasetError) {
    console.error('datasets insert failed:', datasetError)
    return NextResponse.json(
      { error: 'Failed to create dataset', details: datasetError.message },
      { status: 500 }
    )
  }

  await admin.from('uploads').update({ status: 'ready' }).eq('id', upload.id).eq('user_id', user.id)

  return NextResponse.json({ datasetId: datasetRow.id })
}

