import { createClient, adminAuthClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { HoldingsTable } from '@/components/portfolio/HoldingsTable'

export default async function ClientPortfolioPage({
  params
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  
  // Check if user is authenticated and is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!agent || agent.role !== 'admin') {
    redirect('/')
  }

  // Get customer data
  const { data: customer } = await supabase
    .from('customers')
    .select()
    .eq('id', params.id)
    .single()

  if (!customer) {
    redirect('/admin/clients')
  }

  // Get customer auth data
  const { data: authData } = await adminAuthClient.getUserById(params.id)
  const customerName = authData.user?.user_metadata?.name || authData.user?.email || 'Unknown Client'

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
    .eq('customer_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // If no portfolio exists, create one
  if (!portfolios) {
    const { data: newPortfolio, error } = await supabase
      .from('portfolios')
      .insert({
        customer_id: params.id,
        name: 'Main Portfolio',
        description: 'Primary investment portfolio'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating portfolio:', error)
      return <div>Error creating portfolio</div>
    }

    return redirect(`/admin/clients/${params.id}/portfolio`)
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Client Portfolio</h1>
          <p className="text-muted-foreground">Managing portfolio for {customerName}</p>
        </div>
      </div>
      
      <HoldingsTable
        portfolioId={portfolios.id}
        holdings={portfolios.holdings || []}
      />
    </div>
  )
} 