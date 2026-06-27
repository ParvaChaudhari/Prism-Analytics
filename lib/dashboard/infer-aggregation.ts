// lib/dashboard/infer-aggregation.ts

const AVG_ALWAYS = [
  // Health & body
  'bmi', 'height', 'weight', 'age', 'temperature', 'heart_rate', 'pulse',
  'blood_pressure', 'cholesterol', 'glucose', 'oxygen', 'intake',
  'consumption', 'consumed', 'calories', 'caloric', 'protein', 'carbohydrate',
  'fat', 'fiber', 'sodium', 'sugar', 'vitamin', 'mineral', 'nutrient',
  'water', 'hydration', 'sleep', 'steps', 'distance',
  // Scores & indexes
  'score', 'index', 'rating', 'rank', 'grade', 'gpa', 'iq',
  'satisfaction', 'happiness', 'engagement', 'sentiment',
  'nps', 'csat', 'quality', 'difficulty', 'complexity',
  'priority', 'severity', 'urgency', 'importance',
  // Risk & probability
  'risk', 'probability', 'likelihood', 'chance', 'odds',
  'confidence', 'certainty', 'accuracy', 'precision',
  'recall', 'f1', 'auc', 'error', 'loss', 'bias',
  // Rates & ratios
  'rate', 'ratio', 'percent', 'pct', 'percentage', 'proportion',
  'share', 'fraction', 'factor', 'coefficient', 'multiplier',
  'growth', 'change', 'delta', 'variance', 'deviation',
  'margin', 'markup', 'discount', 'tax', 'interest', 'yield',
  'return', 'roi', 'roas', 'ctr', 'cpc', 'cpm', 'cvr',
  'conversion', 'retention', 'churn', 'attrition', 'turnover',
  // Performance
  'performance', 'productivity', 'efficiency', 'utilization',
  'throughput', 'velocity', 'speed', 'duration', 'latency',
  'response_time', 'load_time', 'uptime', 'availability',
  'reliability', 'capacity', 'occupancy', 'density',
  // Financial per-unit
  'salary', 'wage', 'income', 'compensation', 'pay', 'earnings',
  'price', 'cost', 'fee', 'tariff', 'premium',
  'revenue_per', 'cost_per', 'value_per', 'average_order',
  'ltv', 'arpu',
  // Demand & forecast
  'demand', 'forecast', 'projection', 'prediction', 'estimate',
  'expected', 'target', 'goal', 'quota', 'benchmark', 'baseline',
  // Environmental
  'humidity', 'pressure', 'wind', 'rainfall', 'precipitation',
  'pollution', 'aqi', 'noise', 'radiation', 'elevation', 'depth',
  // Generic avg indicators
  'average', 'avg', 'mean', 'median', 'level', 'degree', 'intensity'
]

// Only sum when column is explicitly a cumulative total
const SUM_ALWAYS = [
  'total', 'sum', 'count', 'quantity', 'volume', 'units',
  'orders', 'transactions', 'clicks', 'impressions', 'views',
  'downloads', 'installs', 'signups', 'registrations',
  'revenue', 'sales', 'profit', 'loss', 'spend', 'budget',
  'amount', 'balance', 'stock', 'inventory', 'headcount',
  'population', 'participants', 'customers', 'users', 'sessions'
]

export function inferAggregation(
  columnName: string,
  max?: number | null,
  min?: number | null,
  schemaDefault?: 'sum' | 'avg' | 'count'
): 'avg' | 'sum' | 'count' {
  if (schemaDefault) return schemaDefault

  const col = columnName.toLowerCase()

  // Explicit prefix overrides everything
  if (/^(total_|sum_|cumulative_|gross_)/.test(col)) return 'sum'
  if (/^(avg_|average_|mean_|per_)/.test(col)) return 'avg'

  // Check avg keywords first — more common to need avg than sum
  if (AVG_ALWAYS.some(k => col.includes(k))) return 'avg'

  // Check sum keywords
  if (SUM_ALWAYS.some(k => col.includes(k))) return 'sum'

  // Decimal scale 0-1 with no name match → avg
  const isDecimalScale = max != null && min != null && max <= 1.0 && min >= 0
  if (isDecimalScale) return 'avg'

  // Default → avg (most columns are per-record values that should be averaged
  // when grouped by a category — summing them produces misleading huge numbers)
  return 'avg'
}
