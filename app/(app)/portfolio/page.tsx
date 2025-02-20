import { createClient } from '@/utils/supabase/server'
import { PortfolioClient } from './PortfolioClient'
import { HoldingsTable } from '@/components/portfolio/HoldingsTable'
import { redirect } from 'next/navigation'

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

  // Get customer data
  const { data: customer } = await supabase
    .from('customers')
    .select()
    .eq('id', userId)
    .single()

  // Get portfolio data
  const { data: portfolios } = await supabase
    .from('portfolios')
    .select(`
      id,
      name,
      description,
      holdings (
        id,
        symbol,
        asset_type,
        quantity,
        average_price,
        current_price
      )
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // If no portfolio exists, create one
  if (!portfolios) {
    const { data: newPortfolio, error } = await supabase
      .from('portfolios')
      .insert({
        customer_id: userId,
        name: 'Main Portfolio',
        description: 'Primary investment portfolio'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating portfolio:', error)
      return <div>Error creating portfolio</div>
    }

    return redirect('/portfolio')
  }

  return (
    <div className="space-y-8">
      <PortfolioClient agent={agent} customer={customer} />
      
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Holdings</h2>
          <p className="text-sm text-muted-foreground">Manage your portfolio holdings</p>
        </div>
        <div className="p-6">
          <HoldingsTable
            portfolioId={portfolios.id}
            holdings={portfolios.holdings || []}
          />
        </div>
      </div>
    </div>
  )
} 