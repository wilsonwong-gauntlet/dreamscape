import { createClient, adminAuthClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatList } from '@/components/chat/ChatList'
import TicketTable from '@/components/tickets/TicketList/TicketTable'

export const metadata = {
  title: 'Support',
  description: 'Get help and support for your investments'
}

export default async function SupportPage() {
  console.log('Starting support page load')
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
  const ticketsWithDetails = tickets?.map(ticket => {
    console.log('Processing ticket:', {
      id: ticket.id,
      hasTeam: !!ticket.team,
      teamData: ticket.team,
      assignedAgent: ticket.assigned_agent,
      status: ticket.status,
      priority: ticket.priority
    });
    
    return {
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
    }
  }) || []

  console.log('Final tickets data:', {
    totalTickets: ticketsWithDetails.length,
    sampleTicket: ticketsWithDetails[0],
    unassignedCount: ticketsWithDetails.filter(t => !t.team).length,
    urgentCount: ticketsWithDetails.filter(t => t.priority === 'urgent').length,
    myTicketsCount: ticketsWithDetails.filter(t => t.assigned_agent?.id === currentUserId).length
  });

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
        // Customer view - support requests only
        <div className="py-10">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold">My Support Requests</h1>
            <a
              href="/tickets/new"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
            >
              New Support Request
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
        // Agent view - support requests and chats tabs
        <Tabs defaultValue="tickets" className="h-full flex flex-col">
          <div className="px-6 py-4 border-b bg-background">
            <TabsList>
              <TabsTrigger value="tickets">All Requests</TabsTrigger>
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
                  <h1 className="text-2xl font-semibold">Support Requests</h1>
                  <a
                    href="/tickets/new"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
                  >
                    New Request
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
