import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prism - AI-Powered Data Analytics',
  description: 'Upload any CSV/Excel. AI cleans, analyzes, and generates an interactive dashboard.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
