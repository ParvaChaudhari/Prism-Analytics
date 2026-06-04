'use client'

import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'

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

  const icon =
    status === 'error'
      ? 'error'
      : status === 'done'
        ? 'check_circle'
        : status === 'uploading' || status === 'parsing'
          ? 'progress_activity'
          : 'description'

  return (
    <Card className="p-5 flex items-center gap-4">
      <div
        className={[
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          status === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-surface-container text-primary',
        ].join(' ')}
      >
        <Icon
          name={icon}
          size={22}
          className={status === 'uploading' || status === 'parsing' ? 'animate-spin' : ''}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium truncate text-primary">{filename || 'Processing…'}</div>
          <div className="text-sm text-text-secondary shrink-0">{label}</div>
        </div>
        {details ? <div className="text-sm text-text-tertiary mt-1">{details}</div> : null}
      </div>
    </Card>
  )
}
