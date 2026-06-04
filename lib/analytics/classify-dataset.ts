import type { DatasetSchema } from '@/lib/parsers/schema'

export type DatasetType =
  | 'sales'
  | 'marketing'
  | 'supply_chain'
  | 'hr'
  | 'finance'
  | 'other'

const PATTERNS: Array<{ type: DatasetType; keywords: string[] }> = [
  {
    type: 'sales',
    keywords: ['revenue', 'sales', 'order', 'product', 'sku', 'quantity', 'customer', 'invoice'],
  },
  {
    type: 'marketing',
    keywords: ['spend', 'impressions', 'clicks', 'ctr', 'roas', 'campaign', 'channel', 'conversion'],
  },
  {
    type: 'supply_chain',
    keywords: ['inventory', 'stock', 'supplier', 'lead_time', 'reorder', 'warehouse', 'shipment'],
  },
  {
    type: 'hr',
    keywords: ['employee', 'salary', 'department', 'headcount', 'tenure', 'attrition', 'hire'],
  },
  {
    type: 'finance',
    keywords: ['ticker', 'close', 'open', 'volume', 'market', 'portfolio', 'asset', 'equity'],
  },
]

export function classifyDatasetType(schema: DatasetSchema): DatasetType {
  const names = schema.columns.map((c) => c.name.toLowerCase()).join(' ')
  let best: DatasetType = 'other'
  let bestScore = 0

  for (const { type, keywords } of PATTERNS) {
    const score = keywords.filter((kw) => names.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      best = type
    }
  }

  return bestScore > 0 ? best : 'other'
}

export function datasetTypeLabel(type: DatasetType): string {
  switch (type) {
    case 'sales':
      return 'sales/ecommerce'
    case 'marketing':
      return 'marketing'
    case 'supply_chain':
      return 'supply chain'
    case 'hr':
      return 'HR/workforce'
    case 'finance':
      return 'finance'
    default:
      return 'general'
  }
}
