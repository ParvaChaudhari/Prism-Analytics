import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass-nav sticky top-0 z-40">
        <div className="page-container flex h-16 items-center justify-between max-w-[var(--container-max)]">
          <span className="text-xl font-bold text-primary tracking-tight">Prism</span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
            >
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-28 page-container text-center max-w-4xl mx-auto">
          <Badge variant="ai" className="mb-6 normal-case tracking-normal">
            AI-Powered Analytics
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-primary">
            Your data,{' '}
            <span className="ai-gradient-text">beautifully clear.</span>
          </h1>
          <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
            Upload any CSV or Excel file. Prism cleans your data, analyzes it, and generates an
            interactive dashboard in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Start for free
                <Icon name="arrow_forward" size={18} />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                View demo
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-20 page-container max-w-[var(--container-max)] mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card rounded-xl p-8">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-6">
                <Icon name="upload_file" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary">Instant Upload</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Drag and drop messy CSVs. Prism handles parsing, typing, and schema extraction
                automatically.
              </p>
            </div>

            <div className="glass-card rounded-xl p-8">
              <div className="w-12 h-12 rounded-xl ai-gradient flex items-center justify-center mb-6">
                <Icon name="auto_awesome" size={24} className="text-white" filled />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary">AI Data Cleaning</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Identify null values, outliers, and duplicates through a guided health checkup.
              </p>
            </div>

            <div className="glass-card rounded-xl p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Icon name="bar_chart" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary">Auto Dashboards</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Get interactive charts and AI-generated insights tailored to your dataset.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-[10px] uppercase tracking-widest text-text-tertiary border-t border-border-subtle">
        © {new Date().getFullYear()} Prism Analytics
      </footer>
    </div>
  )
}
