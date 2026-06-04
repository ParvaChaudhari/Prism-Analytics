'use client'

function MiniChartPreview() {
  const bars = [40, 65, 50, 80, 55, 70, 45]
  return (
    <div className="h-24 bg-surface-container-low p-4 flex items-end gap-1">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-primary/15 group-hover:bg-primary/25 transition-colors"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

export function DashboardPreviewCard({ title }: { title: string }) {
  return (
    <div className="flex flex-col">
      <MiniChartPreview />
      <span className="sr-only">{title}</span>
    </div>
  )
}
