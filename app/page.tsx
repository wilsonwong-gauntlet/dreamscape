import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check user role
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .single()

  if (agent) {
    redirect('/dashboard')
  }

  const { data: customer } = await supabase
    .from('customers')
    .select()
    .eq('id', user.id)
    .single()

  if (customer) {
    redirect('/dashboard')
  }

  // If no role found, redirect to login
  redirect('/auth/login')
}
