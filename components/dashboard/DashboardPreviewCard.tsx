'use client'

import { Icon } from '@/components/ui/Icon'

const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-400 to-teal-500',
  'from-rose-400 to-red-500',
  'from-amber-400 to-orange-500',
  'from-fuchsia-500 to-purple-600',
  'from-sky-400 to-blue-500',
  'from-violet-500 to-fuchsia-500',
  'from-pink-500 to-rose-400',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

export function DashboardPreviewCard({ title, datasetId }: { title: string; datasetId: string }) {
  const hash = hashString(datasetId)
  const gradientClass = GRADIENTS[hash % GRADIENTS.length]

  return (
    <div className="flex flex-col">
      <div className={`h-28 w-full bg-gradient-to-br ${gradientClass} flex items-center justify-center relative overflow-hidden group`}>
        {/* Abstract pattern overlays for extra texture */}
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        
        {/* Subtle geometric shapes */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-black/10 rounded-full blur-xl" />
        
        {/* Center Icon */}
        <div className="relative z-10 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20 group-hover:scale-110 transition-transform duration-300">
          <Icon name="insert_chart" size={24} className="text-white drop-shadow-md" filled />
        </div>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  )
}
