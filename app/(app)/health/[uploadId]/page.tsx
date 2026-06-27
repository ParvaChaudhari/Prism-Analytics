'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { IssueCard, type Issue } from '@/components/health/IssueCard'
import { GalaxyLoading } from '@/components/ui/GalaxyLoading'

type ScanResponse = { issues: Issue[]; aiNotice?: string }

export default function HealthCheckPage() {
  const router = useRouter()
  const params = useParams()
  const uploadId = typeof params.uploadId === 'string' ? params.uploadId : ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [index, setIndex] = useState(0)
  const [aiNotice, setAiNotice] = useState<string | null>(null)
  const [resolutions, setResolutions] = useState<
    Array<{ issueId: string; action: string; value?: unknown; label: string }>
  >([])

  const current = issues[index]
  const progressText = useMemo(() => {
    if (!issues.length) return '0 of 0 resolved'
    return `${Math.min(index, issues.length)} of ${issues.length} resolved`
  }, [index, issues.length])

  const healthScore = useMemo(() => {
    if (!issues.length) return 100
    const resolved = Math.min(index, issues.length)
    return Math.round(100 - (issues.length - resolved) * (60 / Math.max(issues.length, 1)))
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
        setAiNotice(data.aiNotice ?? null)
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
    router.push(`/dashboard/${data.datasetId}?generate=true`)
  }

  function skipAll() {
    setResolutions(
      issues.map((issue, idx) => ({
        issueId: issue.id || String(idx),
        action: 'keep_as_is',
        label: 'Keep as is',
      }))
    )
    setIndex(issues.length)
  }

  if (loading) {
    return (
      <div className="flex-1 w-full flex flex-col">
        <GalaxyLoading text="AI Health Checkup in progress..." />
      </div>
    )
  }

  return (
    <div className="page-container py-8 md:py-12 max-w-[var(--container-max)] flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {!loading && issues.length > 0 && index < issues.length ? (
            <Badge variant="secondary" className="mb-3 gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
              Analysis in progress
            </Badge>
          ) : index >= issues.length && issues.length > 0 ? (
            <Badge variant="success" className="mb-3 gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
              Analysis complete
            </Badge>
          ) : null}
          <h1 className="text-[32px] font-semibold text-primary tracking-tight">Data Health Checkup</h1>
          <p className="text-text-secondary mt-1">
            {issues.length
              ? 'Review each finding and choose how Prism should clean your data.'
              : 'No issues detected — you can continue to your dashboard.'}
          </p>
          <p className="text-xs text-text-tertiary mt-2 flex items-center gap-1.5">
            <Icon name="info" size={14} />
            Note: AI analysis may occasionally make mistakes. Please review the findings carefully.
          </p>
          {issues.length > 0 ? (
            <p className="text-sm text-text-tertiary mt-2">{progressText}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {issues.length > 0 && index < issues.length ? (
            <Button variant="secondary" onClick={skipAll}>
              Skip all
            </Button>
          ) : null}
        </div>
      </div>

      {aiNotice ? (
        <Card className="p-4 text-sm text-secondary bg-secondary/5 border border-secondary/20">
          {aiNotice}
        </Card>
      ) : null}

      {issues.length > 0 && !loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 flex flex-col justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">
              Health Score
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">{healthScore}%</span>
              <Icon name="trending_up" size={22} className="text-secondary" />
            </div>
            <div className="mt-6 w-full bg-surface-container rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${healthScore}%` }} />
            </div>
          </Card>
          <Card className="p-6 flex flex-col justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">
              Issues found
            </h3>
            <div className="text-4xl font-bold text-primary">{issues.length}</div>
            <p className="text-sm text-text-secondary mt-6">Across all columns</p>
          </Card>
          <Card className="p-6 flex flex-col justify-between border-l-4 border-l-secondary">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">
              Resolved
            </h3>
            <div className="text-4xl font-bold text-primary">{Math.min(index, issues.length)}</div>
            <p className="text-sm text-text-secondary mt-6">Of {issues.length} total</p>
          </Card>
        </div>
      ) : null}

      {error ? (
        <Card className="p-4 border border-destructive/20 bg-destructive/10 text-destructive">{error}</Card>
      ) : null}

      {index >= issues.length ? (
        <Card className="p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-primary">All set</div>
            <div className="text-sm text-text-secondary mt-1">
              Apply your choices and generate the cleaned dataset.
            </div>
          </div>
          <Button onClick={finish} className="gap-2">
            Apply &amp; Continue
            <Icon name="arrow_forward" size={18} />
          </Button>
        </Card>
      ) : current ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-primary">Detection Details &amp; Actions</h2>
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
        </div>
      ) : (
        <Card className="p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-primary">No issues found</div>
            <div className="text-sm text-text-secondary mt-1">Continue to generate your dashboard.</div>
          </div>
          <Button onClick={finish}>Continue</Button>
        </Card>
      )}
    </div>
  )
}
