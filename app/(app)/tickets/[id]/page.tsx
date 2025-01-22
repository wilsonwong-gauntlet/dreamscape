import { createClient } from '@/app/utils/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import TicketDetail from '@/components/tickets/TicketDetail/TicketDetail'

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const cookieStore = cookies()
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Fetch ticket details
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:customers(id, company),
      assigned_agent:agents(id, team_id, role),
      team:teams(id, name)
    `)
    .eq('id', params.id)
    .single()

  if (ticketError) {
    console.error('Error fetching ticket:', ticketError)
    notFound()
  }

  // Fetch responses
  const { data: responses, error: responsesError } = await supabase
    .from('ticket_responses')
    .select('*')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true })

  if (responsesError) {
    console.error('Error fetching responses:', responsesError)
    // Don't throw here, just show empty responses
  }

  // Get user details for response authors
  const authorIds = Array.from(new Set((responses || []).map(r => r.author_id)))
  const { data: authors } = await supabase
    .from('auth.users')
    .select('id, email, raw_user_meta_data')
    .in('id', authorIds)

  // Map authors to responses
  const responsesWithAuthors = (responses || []).map(response => ({
    ...response,
    author: authors?.find(a => a.id === response.author_id) || null
  }))

  // Fetch ticket history
  const { data: history, error: historyError } = await supabase
    .from('ticket_history')
    .select('*')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true })

  if (historyError) {
    console.error('Error fetching history:', historyError)
    // Don't throw here, just show empty history
  }

  // Get assigned agent details if present
  let assignedAgentDetails = null
  if (ticket?.assigned_agent_id) {
    const { data: agentUser } = await supabase
      .from('auth.users')
      .select('email, raw_user_meta_data')
      .eq('id', ticket.assigned_agent_id)
      .single()
    
    if (agentUser) {
      assignedAgentDetails = {
        ...ticket.assigned_agent,
        email: agentUser.email,
        name: agentUser.raw_user_meta_data?.name
      }
    }
  }

  // Combine all the data
  const ticketData = {
    ...ticket,
    assigned_agent: assignedAgentDetails,
    responses: responsesWithAuthors,
    history: history || [],
    tags: ticket.tags || []
  }

  const handleStatusChange = async (status: string) => {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('tickets')
      .update({ status })
      .eq('id', params.id)
  }

  const handleAssigneeChange = async (agentId: string) => {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('tickets')
      .update({ assigned_agent_id: agentId })
      .eq('id', params.id)
  }

  const handleTagsChange = async (tags: string[]) => {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('tickets')
      .update({ tags })
      .eq('id', params.id)
  }

  const handlePriorityChange = async (priority: string) => {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('tickets')
      .update({ priority })
      .eq('id', params.id)
  }

  const handleTeamChange = async (teamId: string) => {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('tickets')
      .update({ team_id: teamId })
      .eq('id', params.id)
  }

  // Fetch active agents
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('status', 'active')

  // Fetch available teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .order('name')

  // Then fetch user details for those agents
  const agentIds = agents?.map(agent => agent.id) || []
  const { data: userDetails } = await supabase
    .from('auth.users')
    .select('id, email, raw_user_meta_data')
    .in('id', agentIds)

  // Format agent data
  const formattedAgents = agents?.map(agent => {
    const userInfo = userDetails?.find(u => u.id === agent.id)
    const name = userInfo?.raw_user_meta_data?.name
    return {
      id: agent.id,
      name: name || userInfo?.email || 'Unknown Agent',
      email: userInfo?.email,
      team_id: agent.team_id,
      role: agent.role,
      displayName: `${name || 'Unknown'} (${agent.role}${agent.team_id ? ' - ' + (teams?.find(t => t.id === agent.team_id)?.name || '') : ''})`
    }
  }) || []

  return (
    <TicketDetail
      ticket={ticketData}
      teams={teams || []}
      agents={formattedAgents}
      currentUserId={user.id}
      onStatusChange={handleStatusChange}
      onPriorityChange={handlePriorityChange}
      onTeamChange={handleTeamChange}
      onAssigneeChange={handleAssigneeChange}
      onTagsChange={handleTagsChange}
    />
  )
} 