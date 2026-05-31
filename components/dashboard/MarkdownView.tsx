'use client'

function renderLine(line: string, key: number) {
  if (line.startsWith('### ')) {
    return (
      <h3 key={key} className="text-base font-semibold mt-4 mb-2">
        {line.slice(4)}
      </h3>
    )
  }
  if (line.startsWith('## ')) {
    return (
      <h2 key={key} className="text-lg font-semibold mt-5 mb-2">
        {line.slice(3)}
      </h2>
    )
  }
  if (line.startsWith('# ')) {
    return (
      <h1 key={key} className="text-2xl font-bold mb-4">
        {line.slice(2)}
      </h1>
    )
  }
  if (line.startsWith('- ') || line.startsWith('* ')) {
    return (
      <li key={key} className="ml-4 text-text-secondary list-disc">
        {line.slice(2)}
      </li>
    )
  }
  if (!line.trim()) return <div key={key} className="h-2" />
  return (
    <p key={key} className="text-text-secondary leading-relaxed">
      {line}
    </p>
  )
}

export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-1 prose-sm max-w-none">
      {content.split('\n').map((line, i) => renderLine(line, i))}
    </div>
  )
}
