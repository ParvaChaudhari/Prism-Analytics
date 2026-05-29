'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DropZone } from '@/components/upload/DropZone'
import { UploadCard } from '@/components/upload/UploadCard'
type Status = 'idle' | 'uploading' | 'parsing' | 'done' | 'error'

function safeFileExt(name: string) {
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase()
}

export default function UploadPage() {
  const router = useRouter()

  const [status, setStatus] = useState<Status>('idle')
  const [details, setDetails] = useState<string | undefined>(undefined)
  const [filename, setFilename] = useState<string | undefined>(undefined)

  async function handleFile(file: File) {
    setFilename(file.name)
    setDetails(undefined)
    setStatus('uploading')

    const ext = safeFileExt(file.name)
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setStatus('error')
      setDetails('Unsupported file type.')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setStatus('error')
      setDetails('File too large (max 50MB).')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    const storageRes = await fetch('/api/upload/storage', {
      method: 'POST',
      body: formData,
    })

    if (!storageRes.ok) {
      const err = (await storageRes.json().catch(() => null)) as { error?: string } | null
      setStatus('error')
      setDetails(err?.error || 'Upload failed. Please try again.')
      return
    }

    const stored = (await storageRes.json()) as {
      bucket: string
      path: string
      originalFilename: string
      fileSize: number
    }

    setStatus('parsing')

    const res = await fetch('/api/upload/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucket: stored.bucket,
        path: stored.path,
        originalFilename: stored.originalFilename,
        fileSize: stored.fileSize,
      }),
    })

    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null
      setStatus('error')
      setDetails(err?.error || 'Parsing failed. Please try again.')
      return
    }

    const data = (await res.json()) as { uploadId: string }
    setStatus('done')
    setDetails('Schema extracted. Next: health scan.')

    // Phase 3 will use this.
    router.push(`/health/${data.uploadId}`)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">New upload</h2>
          <p className="text-text-secondary">
            Upload a CSV or Excel file. Prism will extract a schema and begin the health check.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.push('/home')}
          disabled={status === 'uploading' || status === 'parsing'}
        >
          Back
        </Button>
      </div>

      <Card className="p-6 flex flex-col gap-4">
        <DropZone
          disabled={status === 'uploading' || status === 'parsing'}
          onFile={handleFile}
        />
      </Card>

      <UploadCard filename={filename} status={status} details={details} />
    </div>
  )
}

