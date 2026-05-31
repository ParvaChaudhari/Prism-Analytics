import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export function AISummaryCard({ title, summary }: { title: string; summary: string }) {
  return (
    <Card className="p-6 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <Badge variant="success">✦ AI</Badge>
      </div>
      <p className="text-text-secondary leading-relaxed">{summary}</p>
    </Card>
  )
}
