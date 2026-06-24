import { DashboardView } from '@/components/dashboard/DashboardView'

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  await params; // Await params to satisfy Next.js 15 requirement
  return <DashboardView />
}
