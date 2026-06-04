const AVG_ALWAYS = [
  'risk', 'score', 'satisfaction', 'performance',
  'rating', 'probability', 'accuracy', 'efficiency',
  'demand', 'index'
]

const AVG_IF_DECIMAL = [
  'rate', 'ratio', 'percent', 'pct', 'growth'
]

const SUM_ALWAYS = [
  'salary', 'revenue', 'sales', 'quantity',
  'amount', 'total', 'cost', 'price', 'spend'
]

export function inferAggregation(
  columnName: string,
  max?: number | null,
  min?: number | null
): 'avg' | 'sum' | 'count' {
  const col = columnName.toLowerCase()

  if (AVG_ALWAYS.some(k => col.includes(k))) return 'avg'
  if (SUM_ALWAYS.some(k => col.includes(k))) return 'sum'

  const isDecimalScale = max != null && min != null && max <= 1.0 && min >= 0
  if (AVG_IF_DECIMAL.some(k => col.includes(k))) return 'avg'
  if (isDecimalScale) return 'avg'

  return 'sum'
}
