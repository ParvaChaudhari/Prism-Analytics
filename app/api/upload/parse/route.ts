import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseCsvFile } from '@/lib/parsers/csv'
import { parseExcelFile } from '@/lib/parsers/excel'
import { buildSchemaFromRows } from '@/lib/parsers/schema'

export const runtime = 'nodejs'

type Body = {
  bucket: string
  path: string
  originalFilename?: string
  fileSize?: number
}

function getExt(path: string) {
  const idx = path.lastIndexOf('.')
  return idx === -1 ? '' : path.slice(idx + 1).toLowerCase()
}

export async function POST(request: Request) {
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.bucket || !body.path) {
    return NextResponse.json({ error: 'Missing bucket or path' }, { status: 400 })
  }

  const ext = getExt(body.path)
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: fileData, error: downloadError } = await admin.storage
    .from(body.bucket)
    .download(body.path)

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: 'Failed to download file from storage' },
      { status: 400 }
    )
  }

  // Prevent OOM by explicitly rejecting files larger than 3MB 
  // before reading the Blob into an ArrayBuffer in memory
  if (fileData.size > 3 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large to parse (max 3MB)' },
      { status: 400 }
    )
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

  const filename = body.path.split('/').pop() || body.path
  const originalFilename = body.originalFilename || filename

  const { data: uploadRow, error: insertError } = await admin
    .from('uploads')
    .insert({
      user_id: user.id,
      filename,
      original_filename: originalFilename,
      storage_path: body.path,
      file_size: body.fileSize ?? null,
      row_count: schema.rowCount,
      column_count: schema.columns.length,
      status: 'scanning',
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to store upload metadata' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    uploadId: uploadRow.id,
    schema,
  })
}

