import { createClient, adminAuthClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface Customer {
  id: string
  company: string | null
  created_at: string
  email: string | null
  name: string | null
  portfolios: Array<{
    id: string
    name: string
    holdings: Array<{
      id: string
      symbol: string
      quantity: number
      current_price: number
    }>
  }>
}

function calculatePortfolioValue(holdings: Customer['portfolios'][0]['holdings']): number {
  return holdings.reduce((total, holding) => {
    return total + (holding.quantity * (holding.current_price || 0))
  }, 0)
}

export default async function ClientsPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated and is admin
  const { data: { user } } = await supabase.auth.getUser()
  console.log('Current user:', user)

  if (!user) {
    redirect('/login')
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log('Agent data:', agent)

  if (!agent || agent.role !== 'admin') {
    redirect('/')
  }

  // First get all customers
  const { data: customersRaw, error: customersError } = await supabase
    .from('customers')
    .select(`
      id,
      company,
      created_at,
      portfolios (
        id,
        name,
        holdings (
          id,
          symbol,
          quantity,
          current_price
        )
      )
    `)
    .order('created_at', { ascending: false })

  console.log('Customers query error:', customersError)
  console.log('Raw customers data:', customersRaw)

  if (!customersRaw?.length) {
    console.log('No customers found in the database')
  }

  // Get auth data for each customer using adminAuthClient
  const authUsersPromises = customersRaw?.map(customer => 
    adminAuthClient.getUserById(customer.id)
  ) || []

  const authUsersResponses = await Promise.all(authUsersPromises)
  const authUsers = authUsersResponses.map(response => response.data.user)

  console.log('Auth users data:', authUsers)

  // Combine the data
  const customers: Customer[] = customersRaw?.map(customer => {
    const authUser = authUsers?.find(u => u?.id === customer.id)
    if (!authUser) {
      console.log('No auth user found for customer:', customer.id)
    }
    return {
      ...customer,
      email: authUser?.email || null,
      name: (authUser?.user_metadata?.name as string) || null
    }
  }) || []

  console.log('Final combined customers data:', customers)

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Portfolio Value</TableHead>
              <TableHead>Client Since</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name || 'N/A'}</TableCell>
                <TableCell>{customer.email || 'N/A'}</TableCell>
                <TableCell>{customer.company || 'N/A'}</TableCell>
                <TableCell>
                  {formatCurrency(calculatePortfolioValue(customer.portfolios?.[0]?.holdings || []))}
                </TableCell>
                <TableCell>{formatDate(customer.created_at)}</TableCell>
                <TableCell>
                  <Button asChild variant="outline">
                    <Link href={`/admin/clients/${customer.id}/portfolio`}>
                      View Portfolio
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 
