import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/auth/SignupForm'
import { createClient } from '@/lib/supabase/server'

export default async function SignupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/home')

  return <SignupForm />
}
