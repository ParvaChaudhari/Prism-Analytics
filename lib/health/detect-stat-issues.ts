import { buildScanPayload } from './build-scan-payload'

export function detectStatIssues(scanPayload: ReturnType<typeof buildScanPayload>) {
  const issues = []

  for (const col of scanPayload.columns as any[]) {
    // Numeric column with lots of non-numeric values
    if (col.type === 'number' && col.invalidCount > 0) {
      const pct = ((col.invalidCount / scanPayload.rowCount) * 100).toFixed(1)
      issues.push({
        issue_type: 'type_mismatch',
        column_name: col.name,
        severity: col.invalidCount > scanPayload.rowCount * 0.2 ? 'high' : 'medium',
        title: 'Numeric column contains non-numeric values',
        description: `"${col.name}" has ${col.invalidCount} values (${pct}%) that couldn't be parsed as numbers. This will affect averages and charts.`,
        affected_rows: col.invalidCount,
        options: [
          { label: 'Drop invalid rows', action: 'drop_invalid' },
          { label: 'Replace with column average', action: 'fill_mean' },
          { label: 'Treat entire column as text', action: 'cast_string' },
        ]
      })
    }

    // Outliers — stdDev > 3x mean
    if (col.type === 'number' && col.stdDev && col.mean &&
        col.stdDev > Math.abs(col.mean) * 3) {
      issues.push({
        issue_type: 'outlier',
        column_name: col.name,
        severity: 'medium',
        title: 'Extreme values detected that may skew analysis',
        description: `"${col.name}" has a high spread (mean: ${col.mean}, stdDev: ${col.stdDev}, max: ${col.max}). Charts and averages may be misleading.`,
        affected_rows: null,
        options: [
          { label: 'Cap outliers at 3 standard deviations', action: 'cap_outliers' },
          { label: 'Remove outlier rows', action: 'drop_outliers' },
          { label: 'Keep as is', action: 'keep' },
        ]
      })
    }

    // String column that looks numeric
    if (col.type === 'string' && col.sample) {
      const numericAttempt = col.sample.map(Number).filter(Number.isFinite)
      if (numericAttempt.length > col.sample.length * 0.8) {
        issues.push({
          issue_type: 'type_mismatch',
          column_name: col.name,
          severity: 'medium',
          title: 'Text column contains mostly numbers',
          description: `"${col.name}" looks numeric but is stored as text. Converting enables charts and averages.`,
          affected_rows: null,
          options: [
            { label: 'Convert to numeric', action: 'cast_number' },
            { label: 'Keep as text', action: 'keep' },
          ]
        })
      }
    }

    // Only one unique value — useless for analysis
    if (col.uniqueCount === 1) {
      issues.push({
        issue_type: 'low_variance',
        column_name: col.name,
        severity: 'low',
        title: 'Column has only one unique value',
        description: `"${col.name}" is identical for every row and won't add insight to any chart.`,
        affected_rows: null,
        options: [
          { label: 'Drop this column', action: 'drop_column' },
          { label: 'Keep as is', action: 'keep' },
        ]
      })
    }

    // Stats failed entirely
    if (col.warning && !col.mean && col.type === 'number') {
      issues.push({
        issue_type: 'compute_error',
        column_name: col.name,
        severity: 'high',
        title: 'Could not analyze this column',
        description: `"${col.name}" has severe data issues: ${col.warning}. Review and clean this column before generating charts.`,
        affected_rows: null,
        options: [
          { label: 'Drop this column', action: 'drop_column' },
          { label: 'Keep as is', action: 'keep' },
        ]
      })
    }

    // Granularity: Full date when year is better
    if (col.type === 'date' && col.uniqueCount > scanPayload.rowCount * 0.5) {
      issues.push({
        issue_type: 'granularity',
        column_name: col.name,
        severity: 'low',
        title: 'Date column may be too granular',
        description: `"${col.name}" contains full dates but year-level grouping may be more useful for trend analysis.`,
        affected_rows: null,
        options: [
          { label: 'Extract year only', action: 'extract_year' },
          { label: 'Keep full date', action: 'keep' },
        ]
      })
    }

    // List strings: Python list formats like ['Drama', 'Fantasy']
    if (col.type === 'string' && col.sample) {
      const listFormatCount = col.sample.filter((v: any) => 
        typeof v === 'string' && v.trim().startsWith('[')
      ).length

      if (listFormatCount > col.sample.length * 0.3) {
        issues.push({
          issue_type: 'list_format',
          column_name: col.name,
          severity: 'medium',
          title: 'Column contains list values',
          description: `"${col.name}" stores multiple values per cell. It cannot be used for grouping or charting without parsing.`,
          affected_rows: null,
          options: [
            { label: 'Exclude from charts', action: 'exclude' },
            { label: 'Use first value only', action: 'use_first' },
          ]
        })
      }
    }
  }

  return issues
}
