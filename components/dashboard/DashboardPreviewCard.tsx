'use client'

function MiniChartPreview() {
  const bars = [40, 65, 50, 80, 55, 70, 45]
  return (
    <div className="h-20 rounded-[10px] bg-surface border border-border-subtle p-3 flex items-end gap-1">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-accent/70"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

export function DashboardPreviewCard({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <MiniChartPreview />
      <div className="text-xs text-text-tertiary truncate">{title}</div>
    </div>
  )
}
