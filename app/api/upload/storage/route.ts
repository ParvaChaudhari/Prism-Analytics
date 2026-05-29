import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const BUCKET = 'uploads'
const MAX_BYTES = 50 * 1024 * 1024

function contentTypeForExt(ext: string) {
  switch (ext) {
    case 'csv':
      return 'text/csv'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'xls':
      return 'application/vnd.ms-excel'
    default:
      return 'application/octet-stream'
  }
}

export async function POST(request: Request) {
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const name = file.name || 'upload'
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
  }

  const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: contentTypeForExt(ext),
    upsert: false,
    cacheControl: '3600',
  })

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || 'Storage upload failed' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    bucket: BUCKET,
    path: objectPath,
    originalFilename: name,
    fileSize: file.size,
  })
}
