'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { clearDashboardCache } from '@/lib/dashboard/dashboard-cache'

export function DeleteDatasetButton({ datasetId }: { datasetId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/datasets/${datasetId}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        throw new Error('Failed to delete dataset')
      }
      
      clearDashboardCache(datasetId)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Failed to delete dataset')
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className={`p-2 rounded-lg transition-colors absolute top-3 right-3 z-10 
        ${deleting 
          ? 'text-neutral-400 bg-neutral-100 dark:bg-neutral-800' 
          : 'text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 bg-white/50 dark:bg-black/50 backdrop-blur-sm'
        }`}
      aria-label="Delete dataset"
    >
      <Trash2 size={18} className={deleting ? 'opacity-50' : ''} />
    </button>
  )
}
