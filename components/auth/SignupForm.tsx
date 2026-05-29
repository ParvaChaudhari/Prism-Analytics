'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-1">Create an account</h1>
          <p className="text-sm text-text-secondary">Get started with Prism</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {notice ? (
            <div className="text-sm text-text-primary bg-surface border border-border-subtle rounded-[10px] px-3 py-2">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-[10px] px-3 py-2">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign Up'}
          </Button>
        </form>

        <p className="text-sm text-center text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  )
}

