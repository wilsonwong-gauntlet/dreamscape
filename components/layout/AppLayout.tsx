'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import CustomerNav from './nav/CustomerNav'
import AgentNav from './nav/AgentNav'
import AdminNav from './nav/AdminNav'
import Header from './Header'
import { Loader2 } from 'lucide-react'
import { Chat } from '@/components/chat/Chat'

interface AppLayoutProps {
  children: ReactNode
}

type UserRole = 'customer' | 'agent' | 'admin' | null

export default function AppLayout({ children }: AppLayoutProps) {
  const [role, setRole] = useState<UserRole>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
    
  useEffect(() => {
    async function getUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/login')
          return
        }

        // Get user role from profiles
        const { data: agent } = await supabase
          .from('agents')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (agent) {
          setRole(agent.role as UserRole)
          setIsLoading(false)
          return
        }

        const { data: customer } = await supabase
          .from('customers')
          .select()
          .eq('id', user.id)
          .maybeSingle()

        if (customer) {
          setRole('customer')
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error getting user role:', error)
        setIsLoading(false)
      }
    }

    getUserRole()
  }, [router, supabase])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!role) return null

  return (
    <div className="flex h-screen bg-background">
      <nav className="w-64 border-r bg-muted/40">
        {role === 'customer' && <CustomerNav />}
        {role === 'agent' && <AgentNav />}
        {role === 'admin' && <AdminNav />}
      </nav>
      <main className="flex-1">
        <Header />
        <div className="container mx-auto py-6">
          {children}
        </div>
        {role === 'customer' && <Chat />}
      </main>
    </div>
  )
} 