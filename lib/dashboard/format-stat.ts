export function formatStatValue(value: number, columnName: string): string {
  const col = columnName.toLowerCase()

  if (['salary', 'revenue', 'income', 'wage', 'compensation', 'pay', 'cost', 'price']
      .some(k => col.includes(k))) {
    return `$${Math.round(value).toLocaleString()}`
  }
  if (col.includes('rating') || col.includes('score')) {
    return value.toFixed(1)
  }
  if (value >= 0 && value <= 1.0) return `${(value * 100).toFixed(1)}%`
  if (['growth', 'rate', 'percent', 'pct', 'ratio'].some(k => col.includes(k))) {
    return `${value.toFixed(1)}%`
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
  return value.toFixed(2)
}
