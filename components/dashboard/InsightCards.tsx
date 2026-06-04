import { Card } from '@/components/ui/Card'
import type { Insight } from '@/types/dashboard'
import { Icon } from '@/components/ui/Icon'

function configForType(type: Insight['type']) {
  switch (type) {
    case 'positive':
      return { color: 'border-l-green-500', text: 'text-green-500', icon: 'sentiment_very_satisfied' as const }
    case 'warning':
      return { color: 'border-l-orange-500', text: 'text-orange-500', icon: 'warning' as const }
    case 'negative':
      return { color: 'border-l-destructive', text: 'text-destructive', icon: 'priority_high' as const }
    default:
      return { color: 'border-l-blue-400', text: 'text-blue-400', icon: 'trending_up' as const }
  }
}

export function InsightCards({ insights }: { insights: Insight[] }) {
  if (!insights.length) return null

  return (
    <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
      {insights.map((insight, idx) => {
        const config = configForType(insight.type)
        return (
          <div
            key={`${insight.title}-${idx}`}
            className={`flex-none w-72 glass-card rounded-lg p-3 border-l-4 ${config.color}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon name={config.icon} size={18} className={config.text} />
              <span className="text-primary font-bold text-[11px] uppercase tracking-wider">
                {insight.title}
              </span>
            </div>
            <p className="text-text-secondary text-[11px] leading-tight line-clamp-3">
              {insight.description}
            </p>
          </div>
        )
      })}
    </div>
  )
}
