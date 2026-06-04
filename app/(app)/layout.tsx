import { AppNav } from '@/components/layout/AppNav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNav />
      <main className="flex-1">{children}</main>
    </div>
  )
}
