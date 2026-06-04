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
  if (m.includes('user already registered')) return 'An account with this email already exists.'
  if (m.includes('invalid email')) return 'Please enter a valid email address.'
  if (m.includes('password')) return 'Please choose a stronger password.'
  return message
}

export function SignupForm() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || ''

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: origin
        ? {
            emailRedirectTo: `${origin}/home`,
          }
        : undefined,
    })

    setLoading(false)

    if (signUpError) {
      setError(humanizeAuthError(signUpError.message))
      return
    }

    if (data.session) {
      router.replace('/home')
      router.refresh()
      return
    }

    setNotice('Check your email to confirm your account, then log in.')
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
            <h2 className="text-[32px] font-semibold text-primary text-center tracking-tight">
              Create Account
            </h2>
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
              <label className="block text-sm font-medium text-text-secondary" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
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

            {notice ? (
              <div className="text-sm text-text-primary bg-secondary/5 border border-secondary/20 rounded-xl px-3 py-2">
                {notice}
              </div>
            ) : null}

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
                  Sign Up
                  <Icon name="arrow_forward" size={18} />
                </>
              )}
            </Button>
          </form>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-sm text-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline ml-1">
              Sign in
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
