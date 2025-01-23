import { createClient, adminAuthClient } from '@/utils/supabase/server'
import TicketTable from '@/components/tickets/TicketList/TicketTable'
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

  const currentUserId = user?.id

  console.log('Building ticket query')
  // Fetch tickets based on user's role
  let query = supabase
    .from('tickets')
    .select(`
      *,
      customer:customers(id),
      assigned_agent:agents(id),
      team:teams(id, name),
      last_response:ticket_responses(
        author_id,
        created_at
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1, { foreignTable: 'ticket_responses' })

  console.log('Executing ticket query')
  const { data: tickets, error: ticketsError } = await query
  
  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError)
    throw new Error('Failed to fetch tickets')
  }
  console.log('Tickets fetched:', tickets?.length || 0)

  // Fetch customer details using adminAuthClient
  const customerIds = Array.from(new Set(tickets?.map(t => t.customer?.id) || []))
  const customerPromises = customerIds.map(id => id ? adminAuthClient.getUserById(id) : null)
  const customerResults = await Promise.all(customerPromises.filter(Boolean))
  const customerDetails = customerResults
    .filter(result => result?.data?.user)
    .map(result => {
      const user = result!.data.user!
      return {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    })

  // Fetch assigned agent details using adminAuthClient
  const agentIds = Array.from(new Set(tickets?.map(t => t.assigned_agent?.id).filter(Boolean) || []))
  const agentPromises = agentIds.map(id => adminAuthClient.getUserById(id))
  const agentResults = await Promise.all(agentPromises)
  const agentDetails = agentResults
    .filter(result => result?.data?.user)
    .map(result => {
      const user = result!.data.user!
      return {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    })

  // Map customer and agent details to tickets
  const ticketsWithDetails = tickets?.map(ticket => ({
    ...ticket,
    customer: ticket.customer ? {
      ...ticket.customer,
      user: customerDetails.find(c => c.id === ticket.customer?.id) || { email: 'unknown@example.com' }
    } : null,
    assigned_agent: ticket.assigned_agent ? {
      ...ticket.assigned_agent,
      user: agentDetails.find(a => a.id === ticket.assigned_agent?.id) || { email: 'unknown@example.com' }
    } : null,
    last_response: ticket.last_response?.[0] || null
  })) || []

  // Fetch teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')

  // Fetch agents
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, email, team_id')

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
      <TicketTable 
        tickets={ticketsWithDetails} 
        teams={teams || []}
        agents={agents || []}
        currentUserId={currentUserId || ''}
      />
    </div>
  )
} 