'use client'

import type { ChangeEvent } from 'react'
import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { InsightCards } from '@/components/dashboard/InsightCards'
import type { Insight } from '@/types/dashboard'

type DatasetOption = {
  id: string
  name: string
  row_count: number | null
}

type Props = {
  isOpen: boolean
  onClose: () => void
  currentDatasetId: string
}

export function CompareModal({ isOpen, onClose, currentDatasetId }: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    datasetA: { name: string; rowCount: number }
    datasetB: { name: string; rowCount: number }
    insights: Insight[]
  } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setResult(null)
    setError(null)
    fetch(`/api/datasets?exclude=${currentDatasetId}`)
      .then((r) => r.json())
      .then((d: { datasets?: DatasetOption[] }) => setDatasets(d.datasets ?? []))
      .catch(() => setError('Failed to load datasets'))
  }, [isOpen, currentDatasetId])

  async function prepareUploadDataset(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    const storageRes = await fetch('/api/upload/storage', { method: 'POST', body: formData })
    const stored = (await storageRes.json()) as {
      bucket: string
      path: string
      originalFilename: string
      fileSize: number
      error?: string
    }
    if (!storageRes.ok) throw new Error(stored.error || 'Upload failed')

    const parseRes = await fetch('/api/upload/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucket: stored.bucket,
        path: stored.path,
        originalFilename: stored.originalFilename,
        fileSize: stored.fileSize,
      }),
    })
    const parsed = (await parseRes.json()) as { uploadId?: string; error?: string }
    if (!parseRes.ok || !parsed.uploadId) throw new Error(parsed.error || 'Parse failed')

    const scanRes = await fetch('/api/health/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: parsed.uploadId }),
    })
    const scanData = (await scanRes.json()) as {
      issues?: Array<{ id?: string }>
      error?: string
    }
    if (!scanRes.ok) throw new Error(scanData.error || 'Scan failed')

    const issues = scanData.issues ?? []
    const resolutions = issues.map((issue, idx) => ({
      issueId: issue.id || String(idx),
      action: 'keep_as_is',
    }))

    const resolveRes = await fetch('/api/health/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: parsed.uploadId, resolutions }),
    })
    const resolved = (await resolveRes.json()) as { datasetId?: string; error?: string }
    if (!resolveRes.ok || !resolved.datasetId) {
      throw new Error(resolved.error || 'Failed to prepare dataset')
    }

    return resolved.datasetId
  }

  async function runCompare(otherDatasetId: string) {
    setComparing(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetIdA: currentDatasetId,
          datasetIdB: otherDatasetId,
        }),
      })
      const data = (await res.json()) as typeof result & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Compare failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compare failed')
    } finally {
      setComparing(false)
    }
  }

  async function handleCompareSelected() {
    if (!selectedId) return
    await runCompare(selectedId)
  }

  async function handleUploadCompare(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const newDatasetId = await prepareUploadDataset(file)
      await runCompare(newDatasetId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload compare failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compare datasets">
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        {!result ? (
          <>
            <p className="text-sm text-text-secondary">
              Compare this dashboard&apos;s dataset with another file or an existing dataset.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Existing dataset</label>
              <select
                className="h-10 rounded-[10px] border border-border-subtle bg-background px-3 text-[15px]"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Select a dataset…</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count ?? '?'} rows)
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                onClick={handleCompareSelected}
                disabled={!selectedId || comparing}
              >
                {comparing ? 'Comparing…' : 'Compare selected'}
              </Button>
            </div>

            <div className="relative flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-xs text-text-tertiary">or</span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Upload second file</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                disabled={uploading || comparing}
                onChange={handleUploadCompare}
                className="text-sm"
              />
              {uploading ? (
                <p className="text-sm text-text-secondary">Uploading and preparing dataset…</p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <Card className="p-4 flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge>{result.datasetA.name}</Badge>
                <span className="text-text-tertiary">vs</span>
                <Badge variant="warning">{result.datasetB.name}</Badge>
              </div>
              <p className="text-sm text-text-secondary">
                {result.datasetA.rowCount} rows compared with {result.datasetB.rowCount} rows
              </p>
            </Card>
            <InsightCards insights={result.insights} />
            <Button variant="secondary" onClick={() => setResult(null)}>
              Compare another
            </Button>
          </>
        )}

        {error ? (
          <p className="text-sm text-destructive bg-destructive/10 rounded-[10px] px-3 py-2">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
