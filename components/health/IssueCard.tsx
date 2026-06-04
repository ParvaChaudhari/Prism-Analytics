'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'

export type Issue = {
  id?: string
  issue_type: string
  column_name: string | null
  description: string
  affected_rows: number
  severity?: 'low' | 'medium' | 'high' | 'critical'
  title?: string
  impact?: string
  options: Array<{ label: string; action: string; value?: unknown }>
}

function severityVariant(issueType: string): 'destructive' | 'warning' | 'default' {
  const t = issueType.toLowerCase()
  if (t.includes('duplicate') || t.includes('null') || t.includes('missing')) return 'destructive'
  if (t.includes('outlier') || t.includes('format')) return 'warning'
  return 'default'
}

function issueIcon(issueType: string) {
  const t = issueType.toLowerCase()
  if (t.includes('null') || t.includes('missing')) return 'error'
  if (t.includes('duplicate')) return 'content_copy'
  if (t.includes('outlier')) return 'show_chart'
  return 'warning'
}

export function IssueCard({
  issue,
  onChoose,
}: {
  issue: Issue
  onChoose: (choice: { action: string; value?: unknown; label: string }) => void
}) {
  const severity = issue.severity ?? severityVariant(issue.issue_type)
  const headline = issue.title ?? issue.description

  return (
    <Card className="p-6 flex flex-col gap-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={[
              'p-3 rounded-lg shrink-0',
              severity === 'critical' || severity === 'high'
                ? 'bg-destructive/10 text-destructive'
                : severity === 'medium'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-surface-container text-primary',
            ].join(' ')}
          >
            <Icon name={issueIcon(issue.issue_type)} size={24} />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-primary">{headline}</h4>
            {issue.title ? (
              <p className="text-sm text-text-secondary mt-1">{issue.description}</p>
            ) : null}
            <p className="text-sm text-text-secondary mt-1">
              {issue.column_name ? `${issue.column_name} • ` : ''}
              {Number.isFinite(issue.affected_rows)
                ? `${issue.affected_rows.toLocaleString()} rows affected`
                : 'Rows affected unknown'}
            </p>
            {issue.impact ? (
              <p className="text-sm text-text-tertiary mt-2 italic">{issue.impact}</p>
            ) : null}
          </div>
        </div>
        <Badge
          variant={
            severity === 'critical' || severity === 'high'
              ? 'destructive'
              : severity === 'medium'
                ? 'warning'
                : 'secondary'
          }
        >
          {severity}
        </Badge>
      </div>

      {issue.options?.[0] ? (
        <div className="bg-surface-container-low rounded-lg p-4 flex items-start gap-4 border border-secondary/10">
          <div className="w-10 h-10 rounded-full ai-gradient flex items-center justify-center shrink-0 shadow-sm">
            <Icon name="auto_awesome" size={20} className="text-white" filled />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-ai-accent mb-1">AI Recommendation</p>
            <p className="text-sm text-text-secondary">{issue.options[0].label}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2">
        {issue.options?.length ? (
          issue.options.map((opt, idx) => (
            <Button
              key={`${opt.action}-${idx}`}
              variant={idx === 0 ? 'primary' : 'secondary'}
              onClick={() => onChoose({ action: opt.action, value: opt.value, label: opt.label })}
              className="flex-1 justify-center"
            >
              {opt.label}
            </Button>
          ))
        ) : (
          <Button onClick={() => onChoose({ action: 'keep_as_is', label: 'Keep as is' })} className="w-full">
            Keep as is
          </Button>
        )}
      </div>
    </Card>
  )
}
