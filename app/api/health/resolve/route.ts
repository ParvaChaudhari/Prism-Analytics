import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseCsvFile } from '@/lib/parsers/csv'
import { parseExcelFile } from '@/lib/parsers/excel'
import { buildSchemaFromRows } from '@/lib/parsers/schema'
import { inferSchemaAggregations } from '@/lib/health/infer-schema-aggregations'

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

    if (action === 'keep_as_is' || action === 'keep') continue

    // ── Null / missing ──────────────────────────────────────────────────────
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

    // ── Invalid category → null ─────────────────────────────────────────────
    if (action === 'map_to_null' && column) {
      const badValue = r.value // e.g. "island"
      rows = rows.map((row) => {
        if (badValue !== undefined && row[column] === badValue) {
          return { ...row, [column]: null }
        }
        return row
      })
      continue
    }

    // ── Whitespace ───────────────────────────────────────────────────────────
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

    // ── Deduplication ────────────────────────────────────────────────────────
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

    // ── Numeric column: drop rows with non-parseable values ──────────────────
    if (action === 'drop_invalid' && column) {
      rows = rows.filter((row) => {
        const v = row[column]
        if (isNullish(v)) return false
        const n = Number(String(v).replace(/[,$%]/g, ''))
        return Number.isFinite(n)
      })
      continue
    }

    // ── Numeric column: replace non-parseable values with column mean ─────────
    if (action === 'fill_mean' && column) {
      const nums = rows
        .map((r) => Number(String(r[column] ?? '').replace(/[,$%]/g, '')))
        .filter((n) => Number.isFinite(n))
      const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
      rows = rows.map((row) => {
        const v = row[column]
        const n = Number(String(v ?? '').replace(/[,$%]/g, ''))
        if (!Number.isFinite(n)) return { ...row, [column]: mean }
        return row
      })
      continue
    }

    // ── Cast string column → number ──────────────────────────────────────────
    if (action === 'cast_number' && column) {
      rows = rows.map((row) => {
        const v = row[column]
        const n = Number(String(v ?? '').replace(/[,$%]/g, ''))
        return { ...row, [column]: Number.isFinite(n) ? n : null }
      })
      continue
    }

    // ── Cast column → string (no-op for text, strips non-string types) ────────
    if (action === 'cast_string' && column) {
      rows = rows.map((row) => {
        const v = row[column]
        return { ...row, [column]: v === null || v === undefined ? null : String(v) }
      })
      continue
    }

    // ── Cap outliers at ±3 standard deviations ───────────────────────────────
    if (action === 'cap_outliers' && column) {
      const nums = rows
        .map((r) => Number(r[column]))
        .filter((n) => Number.isFinite(n))
      if (nums.length) {
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length
        const stdDev = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length)
        const lo = mean - 3 * stdDev
        const hi = mean + 3 * stdDev
        rows = rows.map((row) => {
          const n = Number(row[column])
          if (!Number.isFinite(n)) return row
          return { ...row, [column]: Math.min(Math.max(n, lo), hi) }
        })
      }
      continue
    }

    // ── Drop rows that are outliers (>3 stdDev) ───────────────────────────────
    if (action === 'drop_outliers' && column) {
      const nums = rows
        .map((r) => Number(r[column]))
        .filter((n) => Number.isFinite(n))
      if (nums.length) {
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length
        const stdDev = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length)
        rows = rows.filter((row) => {
          const n = Number(row[column])
          if (!Number.isFinite(n)) return true // keep non-numeric (already handled elsewhere)
          return Math.abs(n - mean) <= 3 * stdDev
        })
      }
      continue
    }

    // ── Drop entire column from all rows ─────────────────────────────────────
    if (action === 'drop_column' && column) {
      rows = rows.map((row) => {
        const next = { ...row }
        delete next[column]
        return next
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
    .select('id, user_id, storage_path, computed_stats')
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

  // Use AI to determine default aggregation for numeric columns
  const aiAggregations = await inferSchemaAggregations(rawSchema, upload.computed_stats, user.id)
  if (Object.keys(aiAggregations).length > 0) {
    for (const col of rawSchema.columns) {
      if (col.type === 'number' && aiAggregations[col.name]) {
        col.defaultAggregation = aiAggregations[col.name]
      }
    }
  }

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

