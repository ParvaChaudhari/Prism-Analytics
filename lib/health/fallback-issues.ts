import type { DatasetSchema } from '@/lib/parsers/schema'

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'

export type HealthIssueInput = {
  issue_type: string
  column_name: string | null
  description: string
  affected_rows: number
  options: Array<{ label: string; action: string; value?: unknown; description?: string }>
  severity?: IssueSeverity
  title?: string
  impact?: string
}

const META_ACTION = '__meta__'

export function attachIssueMeta(
  options: HealthIssueInput['options'],
  issue: Pick<HealthIssueInput, 'severity' | 'title' | 'impact'>
): HealthIssueInput['options'] {
  const resolutions = options.filter((o) => o.action !== META_ACTION)
  if (!issue.severity && !issue.title && !issue.impact) return resolutions

  return [
    ...resolutions,
    {
      label: META_ACTION,
      action: META_ACTION,
      value: {
        severity: issue.severity,
        title: issue.title,
        impact: issue.impact,
      },
    },
  ]
}

export function extractIssueMeta(options: unknown): {
  options: HealthIssueInput['options']
  fields: { severity?: IssueSeverity; title?: string; impact?: string }
} {
  if (!Array.isArray(options)) {
    return { options: [], fields: {} }
  }

  const list = options as HealthIssueInput['options']
  const metaOpt = list.find((o) => o.action === META_ACTION)
  const resolutions = list.filter((o) => o.action !== META_ACTION)
  const metaValue = metaOpt?.value as
    | { severity?: IssueSeverity; title?: string; impact?: string }
    | undefined

  return {
    options: resolutions,
    fields: {
      severity: metaValue?.severity,
      title: metaValue?.title,
      impact: metaValue?.impact,
    },
  }
}

export function fallbackIssuesFromSchema(schema: DatasetSchema): HealthIssueInput[] {
  const issues: HealthIssueInput[] = []

  for (const col of schema.columns) {
    if (col.nullCount > 0) {
      const pct = schema.rowCount ? (col.nullCount / schema.rowCount) * 100 : 0
      const severity: IssueSeverity =
        pct > 50 ? 'critical' : pct > 20 ? 'high' : pct > 5 ? 'medium' : 'low'

      issues.push({
        issue_type: 'null_values',
        column_name: col.name,
        title: `Missing values in ${col.name}`,
        description: `Column "${col.name}" has ${col.nullCount} missing values (${pct.toFixed(1)}%).`,
        impact: 'Missing values can skew averages and break charts that require complete data.',
        affected_rows: col.nullCount,
        severity,
        options: [
          { label: 'Drop rows with missing values', action: 'drop_rows_with_nulls' },
          { label: 'Fill with empty string', action: 'fill_nulls', value: '' },
          { label: 'Keep as is', action: 'keep_as_is' },
        ],
      })
    }
  }

  if (!issues.length) {
    issues.push({
      issue_type: 'duplicate_rows',
      column_name: null,
      title: 'No major issues detected',
      description: 'No major issues detected. You can continue.',
      impact: 'Your dataset looks clean enough for analysis.',
      affected_rows: 0,
      severity: 'low',
      options: [{ label: 'Keep as is', action: 'keep_as_is' }],
    })
  }

  return issues
}
