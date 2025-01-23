import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get user role from profiles
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (agent) {
    return <AppLayout role={agent.role}>{children}</AppLayout>
  }

  const { data: customer } = await supabase
    .from('customers')
    .select()
    .eq('id', user.id)
    .maybeSingle()

  if (!customer) {
    redirect('/auth/login')
  }

  return <AppLayout role="customer">{children}</AppLayout>
} 