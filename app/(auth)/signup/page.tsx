import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-1">Create an account</h1>
          <p className="text-sm text-text-secondary">Get started with Prism</p>
        </div>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" placeholder="name@example.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Password</label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full mt-2">Sign Up</Button>
        </form>
        <p className="text-sm text-center text-text-secondary">
          Already have an account? <Link href="/login" className="text-accent hover:underline">Log in</Link>
        </p>
      </Card>
    </div>
  )
}
