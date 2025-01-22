import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get user role
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: customer } = await supabase
    .from('customers')
    .select()
    .eq('id', user.id)
    .single()

  if (!agent && !customer) {
    redirect('/auth/login')
  }

  return <DashboardClient agent={agent} customer={customer} />
} 