import { createClient } from '@/app/utils/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TicketActions } from '@/components/tickets/TicketActions'
import { TicketResponses } from '@/components/tickets/TicketResponses'

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const cookieStore = cookies()
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Not authenticated')
  }

  // Fetch ticket details
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('*, customer:customers(id, company), assigned_agent:agents(id), team:teams(id, name)')
    .eq('id', params.id)
    .single()

  if (ticketError) {
    console.error('Error fetching ticket:', ticketError)
    notFound()
  }

  // Fetch responses separately
  const { data: responses } = await supabase
    .from('ticket_responses')
    .select('*, author:auth.users(email)')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true })

  // Combine the data
  const ticketWithResponses = {
    ...ticket,
    responses: responses || []
  }

  // Fetch available teams for assignment
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .order('name')

  interface AgentUser {
    id: string
    email: string
    user_metadata: {
      name?: string
    }
  }

  interface AgentData {
    id: string
    team_id: string | null
    user: AgentUser
  }

  // Fetch available agents for assignment
  const { data: agents } = await supabase
    .from('agents')
    .select(`
      id,
      team_id,
      user:users (
        id,
        email,
        user_metadata
      )
    `)
    .order('user(email)') as { data: AgentData[] | null }

  // Transform agent data to match the expected format
  const formattedAgents = agents?.map(agent => ({
    id: agent.id,
    name: agent.user.user_metadata?.name || agent.user.email,
    email: agent.user.email,
    team_id: agent.team_id
  })) || []

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/tickets">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{ticket.title}</h1>
            <div className="flex gap-2 items-center">
              <Badge
                variant={
                  ticket.status === 'resolved' || ticket.status === 'closed'
                    ? 'outline'
                    : ticket.status === 'pending'
                    ? 'secondary'
                    : 'default'
                }
              >
                {ticket.status}
              </Badge>
              <Badge
                variant={
                  ticket.priority === 'urgent'
                    ? 'destructive'
                    : ticket.priority === 'high'
                    ? 'secondary'
                    : 'default'
                }
              >
                {ticket.priority}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created {format(new Date(ticket.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          <TicketActions 
            ticket={ticket} 
            teams={teams || []} 
            agents={formattedAgents}
            currentUserId={user.id}
          />
        </div>

        {/* Content */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-card rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>
            
            <TicketResponses 
              ticketId={ticketWithResponses.id} 
              responses={ticketWithResponses.responses || []} 
            />
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Details</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Customer</dt>
                  <dd className="text-sm font-medium">
                    {ticket.customers?.company || 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Team</dt>
                  <dd className="text-sm font-medium">
                    {ticket.teams?.name || 'Unassigned'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Source</dt>
                  <dd className="text-sm font-medium">{ticket.source}</dd>
                </div>
                {ticket.tags && ticket.tags.length > 0 && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Tags</dt>
                    <dd className="flex gap-1 mt-1">
                      {ticket.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 