import { createClient, adminAuthClient } from '@/utils/supabase/server'
import TicketTable from '@/components/tickets/TicketList/TicketTable'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatList } from '@/components/chat/ChatList'

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
    redirect('/auth/login')
  }
  console.log('User found:', user.id)

  const currentUserId = user?.id

  // Get agent role
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .single()

  // Modify ticket query based on user role
  console.log('Building ticket query')
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

  // If user is not an agent, only show their tickets
  if (!agent) {
    query = query.eq('customer_id', user.id)
  }

  console.log('Executing ticket query')
  const { data: tickets, error: ticketsError } = await query
  
  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError)
    throw new Error('Failed to fetch tickets')
  }
  console.log('Tickets fetched:', tickets?.length || 0)

  // Fetch customer details using adminAuthClient
  const customerIds = Array.from(new Set(tickets?.map(t => t.customer?.id) || []))
  console.log('All customer IDs to fetch:', customerIds)
  
  const customerPromises = customerIds.map(id => {
    if (!id) {
      console.log('Skipping null/undefined customer ID')
      return null
    }
    console.log('Creating promise for customer ID:', id)
    try {
      return adminAuthClient.getUserById(id).then(result => {
        console.log('Admin auth result for customer:', id, result)
        return result
      }).catch(error => {
        console.error('Error fetching customer:', id, error)
        return null
      })
    } catch (error) {
      console.error('Error creating promise for customer:', id, error)
      return null
    }
  })
  const customerResults = await Promise.all(customerPromises.filter(Boolean))
  console.log('Raw customer results:', customerResults.map(r => ({
    id: r?.data?.user?.id,
    email: r?.data?.user?.email,
    success: !!r?.data?.user,
    error: r?.error
  })))
  
  const customerDetails = customerResults
    .filter(result => {
      const hasUser = !!result?.data?.user
      if (!hasUser) {
        console.log('Filtering out customer result:', result)
      }
      return hasUser
    })
    .map(result => {
      const user = result!.data.user!
      console.log('Processing customer:', user.id, user.email)
      return {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    })
  console.log('Final processed customer details:', customerDetails)

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
  const ticketsWithDetails = tickets?.map(ticket => {
    const customerDetail = customerDetails.find(c => c.id === ticket.customer?.id)
    console.log('Mapping ticket customer:', {
      ticketId: ticket.id,
      customerId: ticket.customer?.id,
      foundCustomerDetail: customerDetail,
      isAgent: !!agent,
      isOwner: user.id === ticket.customer?.id
    })
    
    return {
      ...ticket,
      customer: ticket.customer ? {
        ...ticket.customer,
        user: customerDetail || 
          (agent || user.id === ticket.customer.id ? 
            { email: 'unknown@example.com' } : 
            { email: '[Hidden]' })
      } : null,
      assigned_agent: ticket.assigned_agent ? {
        ...ticket.assigned_agent,
        user: agentDetails.find(a => a.id === ticket.assigned_agent?.id) || { email: 'unknown@example.com' }
      } : null,
      last_response: ticket.last_response?.[0] || null
    }
  }) || []

  console.log('First ticket with details:', ticketsWithDetails[0])

  // Fetch teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')

  // Fetch agents
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, email, team_id')

  // Get count of active chat sessions
  const { count: activeChatCount } = await supabase
    .from('chat_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  return (
    <div className="h-full flex flex-col">
      {!agent ? (
        // Customer view - tickets only
        <div className="py-10">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold">My Tickets</h1>
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
      ) : (
        // Agent view - tickets and chats tabs
        <Tabs defaultValue="tickets" className="h-full flex flex-col">
          <div className="px-6 py-4 border-b bg-background">
            <TabsList>
              <TabsTrigger value="tickets">All Tickets</TabsTrigger>
              <TabsTrigger value="chats" className="relative">
                Active Chats
                {activeChatCount ? (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                    {activeChatCount}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="tickets" className="h-full">
              <div className="py-10">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-2xl font-semibold">Tickets</h1>
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
            </TabsContent>
            
            <TabsContent value="chats" className="h-full">
              <ChatList />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  )
} 