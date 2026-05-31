'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IssueCard, type Issue } from '@/components/health/IssueCard'

type ScanResponse = { issues: Issue[] }

export default function HealthCheckPage() {
  const router = useRouter()
  const params = useParams()
  const uploadId = typeof params.uploadId === 'string' ? params.uploadId : ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [index, setIndex] = useState(0)
  const [resolutions, setResolutions] = useState<
    Array<{ issueId: string; action: string; value?: unknown; label: string }>
  >([])

  const current = issues[index]
  const progressText = useMemo(() => {
    if (!issues.length) return '0 of 0 resolved'
    return `${Math.min(index, issues.length)} of ${issues.length} resolved`
  }, [index, issues.length])

  useEffect(() => {
    if (!uploadId) {
      setLoading(false)
      setError('Invalid upload link.')
      return
    }

    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/health/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || 'scan failed')
        }
        const data = (await res.json()) as ScanResponse
        if (cancelled) return
        setIssues(data.issues || [])
        setIndex(0)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [uploadId])

  async function finish() {
    if (!uploadId) return

    const res = await fetch('/api/health/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        resolutions: resolutions.map((r) => ({
          issueId: r.issueId,
          action: r.action,
          value: r.value,
        })),
      }),
    })

    if (!res.ok) {
      setError('Something went wrong. Try again.')
      return
    }

    const data = (await res.json()) as { datasetId: string }
    router.push(`/dashboard/${data.datasetId}`)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-2">Health check</h2>
          <p className="text-text-secondary">Scanning your dataset…</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Health check</h2>
          <p className="text-text-secondary">{progressText}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setResolutions(
                issues.map((issue, idx) => ({
                  issueId: issue.id || String(idx),
                  action: 'keep_as_is',
                  label: 'Keep as is',
                }))
              )
              setIndex(issues.length)
            }}
            disabled={!issues.length}
          >
            Skip all
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="p-4 border border-destructive/20 bg-destructive/10 text-destructive">
          {error}
        </Card>
      ) : null}

      {index >= issues.length ? (
        <Card className="p-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">All set</div>
            <div className="text-sm text-text-secondary">
              Apply your choices and generate the cleaned dataset.
            </div>
          </div>
          <Button onClick={finish}>Apply &amp; Continue</Button>
        </Card>
      ) : current ? (
        <IssueCard
          issue={current}
          onChoose={(choice) => {
            const issueId = current.id || String(index)
            setResolutions((prev) => [
              ...prev.filter((r) => r.issueId !== issueId),
              { issueId, ...choice },
            ])
            setIndex((i) => i + 1)
          }}
        />
      ) : (
        <Card className="p-6">
          <div className="text-lg font-semibold">No issues found</div>
          <div className="text-sm text-text-secondary mt-1">
            Continue to generate your dashboard.
          </div>
          <div className="mt-4">
            <Button onClick={finish}>Continue</Button>
          </div>
        </Card>
      )}
    </div>
  )
}

