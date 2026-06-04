import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'

export function AISummaryCard({ summary }: { title?: string; summary: string }) {
  return (
    <Card className="p-8 flex flex-col gap-4 col-span-12">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold text-primary">Executive Summary</h2>
        <Badge variant="ai" className="gap-1 normal-case">
          <Icon name="auto_awesome" size={14} filled className="text-ai-accent" />
          AI Insight
        </Badge>
      </div>
      <p className="text-text-secondary leading-relaxed max-w-4xl text-base">{summary}</p>
    </Card>
  )
}
