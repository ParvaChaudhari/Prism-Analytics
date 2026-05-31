'use client'

import { Card } from '@/components/ui/Card'

type Props = {
  filename?: string
  status: 'idle' | 'uploading' | 'parsing' | 'done' | 'error'
  details?: string
}

export function UploadCard({ filename, status, details }: Props) {
  const label =
    status === 'idle'
      ? 'Ready'
      : status === 'uploading'
        ? 'Uploading…'
        : status === 'parsing'
          ? 'Parsing…'
          : status === 'done'
            ? 'Complete'
            : 'Error'

  return (
    <Card className="p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="font-medium truncate">{filename || 'No file selected'}</div>
        <div className="text-sm text-text-secondary">{label}</div>
      </div>
      {details ? <div className="text-sm text-text-tertiary">{details}</div> : null}
    </Card>
  )
}

