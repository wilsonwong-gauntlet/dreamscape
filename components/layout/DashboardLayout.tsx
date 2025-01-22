'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import CustomerNav from './nav/CustomerNav'
import AgentNav from './nav/AgentNav'
import AdminNav from './nav/AdminNav'
import Header from './Header'
import { Loader2 } from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

type UserRole = 'customer' | 'agent' | 'admin' | null

export default function DashboardLayout({ children }: DashboardLayoutProps) {
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
          .single()

        if (agent) {
          setRole(agent.role as UserRole)
          setIsLoading(false)
          return
        }

        const { data: customer } = await supabase
          .from('customers')
          .select()
          .eq('id', user.id)
          .single()

        if (customer) {
          setRole('customer')
          setIsLoading(false)
          return
        }

        // If no role found, redirect to login
        router.push('/auth/login')
      } catch (error) {
        console.error('Error getting user role:', error)
        router.push('/auth/login')
      } finally {
        setIsLoading(false)
      }
    }

    getUserRole()
  }, [router, supabase])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!role) {
    return null
  }

  const NavComponent = {
    customer: CustomerNav,
    agent: AgentNav,
    admin: AdminNav
  }[role]

  return (
    <div className="min-h-screen bg-background">
      <NavComponent />
      <div className="lg:pl-72">
        <Header />
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 