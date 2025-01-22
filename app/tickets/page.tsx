import { createClient } from '@/app/utils/server'
import { TicketTable } from '@/components/TicketTable'
import { cookies } from 'next/headers'

export default async function TicketsPage() {
  console.log('Starting ticket page load')
  const cookieStore = cookies()
  const supabase = await createClient()
  
  console.log('Fetching user')
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) {
    console.error('User error:', userError)
    throw new Error('Not authenticated')
  }
  if (!user) {
    console.error('No user found')
    throw new Error('Not authenticated')
  }
  console.log('User found:', user.id)

  console.log('Building ticket query')
  // Fetch tickets based on user's role
  let query = supabase
    .from('tickets')
    .select(`
      *,
      customers (
        id,
        company
      ),
      agents (
        id,
        team_id
      ),
      teams (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  console.log('Executing ticket query')
  const { data: tickets, error: ticketsError } = await query
  
  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError)
    throw new Error('Failed to fetch tickets')
  }
  console.log('Tickets fetched:', tickets?.length || 0)

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <a
          href="/tickets/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
        >
          New Ticket
        </a>
      </div>
      <TicketTable tickets={tickets || []} />
    </div>
  )
} 