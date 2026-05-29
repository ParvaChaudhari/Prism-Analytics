import type { DatasetSchema } from '@/lib/parsers/schema'

export type HealthIssueInput = {
  issue_type: string
  column_name: string | null
  description: string
  affected_rows: number
  options: Array<{ label: string; action: string; value?: unknown }>
}

export function fallbackIssuesFromSchema(schema: DatasetSchema): HealthIssueInput[] {
  const issues: HealthIssueInput[] = []

  for (const col of schema.columns) {
    if (col.nullCount > 0) {
      issues.push({
        issue_type: 'null_values',
        column_name: col.name,
        description: `Column "${col.name}" has ${col.nullCount} missing values.`,
        affected_rows: col.nullCount,
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
      description: 'No major issues detected. You can continue.',
      affected_rows: 0,
      options: [{ label: 'Keep as is', action: 'keep_as_is' }],
    })
  }

  return issues
}
