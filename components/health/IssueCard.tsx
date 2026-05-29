'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export type Issue = {
  id?: string
  issue_type: string
  column_name: string | null
  description: string
  affected_rows: number
  options: Array<{ label: string; action: string; value?: unknown }>
}

export function IssueCard({
  issue,
  onChoose,
}: {
  issue: Issue
  onChoose: (choice: { action: string; value?: unknown; label: string }) => void
}) {
  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="text-sm text-text-tertiary">
          {issue.issue_type}
          {issue.column_name ? ` • ${issue.column_name}` : ''}
        </div>
        <div className="text-lg font-semibold">{issue.description}</div>
        <div className="text-sm text-text-secondary">
          Affected rows: {Number.isFinite(issue.affected_rows) ? issue.affected_rows : '—'}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {issue.options?.length ? (
          issue.options.map((opt, idx) => (
            <Button
              key={`${opt.action}-${idx}`}
              variant={idx === 0 ? 'primary' : 'secondary'}
              onClick={() => onChoose({ action: opt.action, value: opt.value, label: opt.label })}
              className="justify-start"
            >
              {opt.label}
            </Button>
          ))
        ) : (
          <Button onClick={() => onChoose({ action: 'keep_as_is', label: 'Keep as is' })}>
            Keep as is
          </Button>
        )}
      </div>
    </Card>
  )
}

