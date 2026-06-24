'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

    if (file.size > 3 * 1024 * 1024) {
      setStatus('error')
      setDetails('File too large (max 3MB).')
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
    setDetails('Schema extracted. Starting health check…')

    router.push(`/health/${data.uploadId}`)
  }

  return (
    <div className="page-container py-8 md:py-12 max-w-[var(--container-max)] flex flex-col gap-8">
      <header>
        <h1 className="text-[32px] font-semibold text-primary tracking-tight mb-2">Upload Data</h1>
        <p className="text-text-secondary text-base max-w-2xl">
          Expand your analysis by importing new source files into your project workspace.
        </p>
      </header>

      <DropZone
        disabled={status === 'uploading' || status === 'parsing'}
        onFile={handleFile}
      />

      {(filename || status !== 'idle') && (
        <UploadCard filename={filename} status={status} details={details} />
      )}

      <div className="flex justify-start">
        <Button
          variant="secondary"
          onClick={() => router.push('/home')}
          disabled={status === 'uploading' || status === 'parsing'}
        >
          Back to dashboards
        </Button>
      </div>
    </div>
  )
}
