'use client'

import type { DragEvent } from 'react'
import { useRef, useState } from 'react'

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
          'rounded-[18px] border border-border-subtle bg-surface-elevated p-8 text-center transition-colors',
          dragOver ? 'border-accent bg-accent-light/50' : '',
          disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:bg-surface',
        ].join(' ')}
        onClick={pick}
        onDragEnter={() => setDragOver(true)}
        onDragLeave={() => setDragOver(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
      >
        <div className="text-lg font-semibold mb-2">Drop your file here</div>
        <div className="text-sm text-text-secondary">
          CSV or Excel • up to 50MB
        </div>
        <div className="text-sm text-text-tertiary mt-4">or click to browse</div>
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

