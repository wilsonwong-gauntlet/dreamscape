import { createClient, adminAuthClient } from '@/utils/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id  // Safe to use ! because of protected layout

  // Get user role
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', userId)
    .single()

  // Get customer data
  const { data: customer } = await supabase
    .from('customers')
    .select()
    .eq('id', userId)
    .single()

  // Get customer auth data
  const { data: authData } = await adminAuthClient.getUserById(userId)
  const customerDetails = authData.user ? {
    email: authData.user.email,
    name: authData.user.user_metadata?.name,
    full_name: authData.user.user_metadata?.full_name
  } : null

  return <DashboardClient 
    agent={agent} 
    customer={customer} 
    customerDetails={customerDetails}
  />
} 