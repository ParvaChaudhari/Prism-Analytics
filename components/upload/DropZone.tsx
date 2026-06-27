'use client'

import type { DragEvent } from 'react'
import { useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

type Props = {
  accept?: string[]
  disabled?: boolean
  onFile: (file: File) => void
}

export function DropZone({ accept = ['.csv', '.xlsx', '.xls'], disabled, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function pick() {
    if (disabled) return
    inputRef.current?.click()
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (disabled) return
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={[
          'upload-dashed p-12 md:p-16 text-center transition-all cursor-pointer',
          dragOver ? 'bg-primary/5' : 'bg-surface-container-low/50',
          disabled ? 'opacity-60 pointer-events-none' : 'hover:bg-surface-container-low',
        ].join(' ')}
        onClick={pick}
        onDragEnter={() => setDragOver(true)}
        onDragLeave={() => setDragOver(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
      >
        <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center mx-auto mb-4">
          <Icon name="cloud_upload" size={28} className="text-primary" />
        </div>
        <div className="text-lg font-semibold text-primary mb-2">Drag & drop your file here</div>
        <div className="text-sm text-text-secondary">CSV or Excel • up to 3MB</div>
        <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-secondary">
          <Icon name="folder_open" size={18} />
          or browse files
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
        }}
      />
    </div>
  )
}
