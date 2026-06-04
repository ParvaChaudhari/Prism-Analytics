import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Insight } from '@/types/dashboard'

function variantForType(type: Insight['type']) {
  switch (type) {
    case 'positive':
      return 'success' as const
    case 'warning':
      return 'warning' as const
    case 'negative':
      return 'destructive' as const
    default:
      return 'default' as const
  }
}

export function InsightCards({ insights }: { insights: Insight[] }) {
  if (!insights.length) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {insights.map((insight, idx) => (
        <Card key={`${insight.title}-${idx}`} className="p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-primary">{insight.title}</h3>
            <Badge variant={variantForType(insight.type)}>{insight.type}</Badge>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{insight.description}</p>
        </Card>
      ))}
    </div>
  )
}
