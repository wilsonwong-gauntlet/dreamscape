import { createClient } from '@/utils/supabase/server'
import { PortfolioClient } from './PortfolioClient'

export const metadata = {
  title: 'Portfolio Overview',
  description: 'View your investment portfolio performance and analytics'
}

export default async function PortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id  // Safe to use ! because of protected layout

  // Get user role
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', userId)
    .single()

  const { data: customer } = await supabase
    .from('customers')
    .select()
    .eq('id', userId)
    .single()

  return <PortfolioClient agent={agent} customer={customer} />
} 