'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAsGuest() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email: 'guest@prismai.demo',
    password: 'demopassword123',
  })

  if (error) {
    console.error('Guest login failed:', error.message)
    // You could redirect to a specific error page, but for now we just throw
    throw new Error('Guest login failed. Ensure the guest account is created in Supabase.')
  }

  // If successful, redirect to the dashboard home
  redirect('/home')
}
