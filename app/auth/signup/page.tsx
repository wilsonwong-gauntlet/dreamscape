'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInviteValid, setIsInviteValid] = useState(false)

  // Get invite params
  const token = searchParams.get('token')
  const inviteEmail = searchParams.get('email')

  // Validate invite if present
  useEffect(() => {
    async function validateInvite() {
      if (!token || !inviteEmail) return

      try {
        const { data, error } = await supabase
          .rpc('validate_invite', {
            invite_token: token,
            invite_email: inviteEmail
          })

        if (error) throw error
        
        setIsInviteValid(true)
        setEmail(inviteEmail)
      } catch (error) {
        console.error('Invalid invite:', error)
        toast.error('Invalid or expired invite')
        router.push('/auth/login')
      }
    }

    validateInvite()
  }, [token, inviteEmail, supabase, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const metadata = token ? { invite_token: token } : {}
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
          data: metadata
        }
      })

      if (error) throw error

      toast.success('Check your email to confirm your account')
      router.push('/auth/login')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  // If using invite link, wait for validation
  if (token && !isInviteValid) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">Validating invite...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center p-8">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Create an Account</h1>
          {token && (
            <p className="text-sm text-muted-foreground">
              You've been invited to join as an agent
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!inviteEmail}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm">
          Already have an account?{' '}
          <a href="/auth/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}


// Main page component
export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpForm />
    </Suspense>
  )
}