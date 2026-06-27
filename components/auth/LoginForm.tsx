'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/client'

function humanizeAuthError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (m.includes('email not confirmed')) return 'Please confirm your email, then try again.'
  if (m.includes('missing email') || m.includes('missing password'))
    return 'Please enter your email and password.'
  return message
}

export function LoginForm() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(humanizeAuthError(signInError.message))
      return
    }

    router.replace('/home')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <main className="w-full max-w-[440px] flex flex-col items-center">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-primary tracking-tight">Prism</h1>
          <p className="text-sm text-text-secondary mt-2">Intelligence for the modern enterprise.</p>
        </div>

        <div className="w-full glass-card rounded-xl p-8 sm:p-10 shadow-md">
          <header className="mb-8">
            <h2 className="text-[32px] font-semibold text-primary text-center tracking-tight">Sign In</h2>
          </header>

          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary" htmlFor="email">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-text-secondary" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
            </div>

            {error ? (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full py-4 h-auto text-[15px] font-semibold gap-2" disabled={loading}>
              {loading ? (
                <Icon name="progress_activity" size={20} className="animate-spin" />
              ) : (
                <>
                  Sign In
                  <Icon name="arrow_forward" size={18} />
                </>
              )}
            </Button>
          </form>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-sm text-text-secondary">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary font-semibold hover:underline ml-1">
              Create an account
            </Link>
          </p>
          <p className="mt-6 text-[10px] uppercase tracking-widest text-text-tertiary">
            This is a demo project. Prism Analytics AI can make mistakes, please double-check insights.
          </p>
        </footer>
      </main>
    </div>
  )
}
