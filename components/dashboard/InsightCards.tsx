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
    <div className="flex gap-4 overflow-x-auto pb-2">
      {insights.map((insight, idx) => (
        <Card key={`${insight.title}-${idx}`} className="min-w-[260px] p-4 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{insight.title}</h3>
            <Badge variant={variantForType(insight.type)}>{insight.type}</Badge>
          </div>
          <p className="text-sm text-text-secondary">{insight.description}</p>
        </Card>
      ))}
    </div>
  )
}
