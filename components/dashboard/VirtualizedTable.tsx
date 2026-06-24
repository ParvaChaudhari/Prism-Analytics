'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualizedTable({
  data,
  columns,
}: {
  data: Array<Record<string, string | number>>
  columns: string[]
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Estimated height of a row in px
    overscan: 5,
  })

  if (columns.length === 0 || data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary h-64">
        No raw data available to display.
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto rounded-xl border border-border-subtle bg-white shadow-sm"
      style={{
        maxHeight: 'calc(100vh - 200px)', // ensure it can scroll
      }}
    >
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="sticky top-0 bg-surface-container-low border-b border-border-subtle z-10">
          <tr>
            <th className="px-4 py-3 font-semibold text-text-secondary w-16">#</th>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 font-semibold text-text-secondary">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowVirtualizer.getVirtualItems().length > 0 && (
            <tr>
              <td style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} colSpan={columns.length + 1} />
            </tr>
          )}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowData = data[virtualRow.index]
            return (
              <tr
                key={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className="border-b border-border-subtle/50 hover:bg-surface-container/50 transition-colors"
              >
                <td className="px-4 py-2 text-text-tertiary w-16">{virtualRow.index + 1}</td>
                {columns.map((col) => {
                  const val = rowData[col]
                  return (
                    <td key={col} className="px-4 py-2 text-primary max-w-[300px] truncate">
                      {val === null || val === undefined ? (
                        <span className="text-text-tertiary opacity-50">null</span>
                      ) : (
                        String(val)
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
          {rowVirtualizer.getVirtualItems().length > 0 && (
            <tr>
              <td
                style={{
                  height: `${
                    rowVirtualizer.getTotalSize() -
                    rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end
                  }px`,
                }}
                colSpan={columns.length + 1}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
