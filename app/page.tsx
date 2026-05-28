import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { ArrowRight, BarChart3, Wand2, FileSpreadsheet } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border-subtle flex items-center justify-between px-6 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold">P</div>
          <span className="font-semibold text-lg tracking-tight">Prism</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary">Log in</Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-24 px-6 text-center max-w-4xl mx-auto">
          <Badge variant="success" className="mb-6">v1.0 is here</Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Your data, <br/>
            <span className="text-accent">beautifully clear.</span>
          </h1>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
            Upload any CSV or Excel file. Our AI cleans your data, analyzes it, and generates a stunning interactive dashboard in seconds.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start for free <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="secondary">View Demo</Button>
            </Link>
          </div>
        </section>

        <section className="py-24 px-6 bg-surface">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-[18px] bg-surface-elevated border border-border-subtle">
              <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center mb-6">
                <FileSpreadsheet size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Upload</h3>
              <p className="text-text-secondary">Drag and drop your messy CSVs. We handle the parsing, typing, and schema extraction automatically.</p>
            </div>
            
            <div className="p-6 rounded-[18px] bg-surface-elevated border border-border-subtle">
              <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center mb-6">
                <Wand2 size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Data Cleaning</h3>
              <p className="text-text-secondary">Our AI identifies null values, outliers, and duplicates, walking you through a simple health check.</p>
            </div>

            <div className="p-6 rounded-[18px] bg-surface-elevated border border-border-subtle">
              <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center mb-6">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Auto Dashboards</h3>
              <p className="text-text-secondary">Get a complete, interactive dashboard with AI-generated insights and charts tailored to your data.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
