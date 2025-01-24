import { createClient, adminAuthClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import TicketDetailWrapper from '@/components/tickets/TicketDetail/TicketDetailWrapper'
import { TicketSatisfactionSection } from '@/components/tickets/TicketSatisfactionSection'

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
    .eq('id', id)
    .single()

  if (ticketError) {
    console.error('Error fetching ticket:', ticketError)
    notFound()
  }

  // Fetch responses
  const { data: responses, error: responsesError } = await supabase
    .from('ticket_responses')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  if (responsesError) {
    console.error('Error fetching responses:', responsesError)
    // Don't throw here, just show empty responses
  }

  // Get user details for response authors
  const authorIds = Array.from(new Set((responses || []).map(r => r.author_id)))
  const authorPromises = authorIds.map(id => adminAuthClient.getUserById(id))
  const authorResults = await Promise.all(authorPromises)
  const authors = authorResults
    .filter(result => result.data?.user !== null)
    .map(result => {
      const user = result.data.user!
      return {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    })

  // Map authors to responses
  const responsesWithAuthors = (responses || []).map(response => {
    const author = authors?.find(a => a.id === response.author_id)
    return {
      ...response,
      author: author ? {
        id: author.id,
        email: author.email || 'unknown@example.com',
        user_metadata: author.user_metadata
      } : null
    }
  })

  // First fetch history entries
  const { data: history, error: historyError } = await supabase
    .from('ticket_history')
    .select()
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  if (historyError) {
    console.error('Error fetching history:', historyError)
  }

  // Then fetch actor details for all history entries
  const actorIds = Array.from(new Set((history || []).map(h => h.actor_id)))
  console.log('Actor IDs:', actorIds)
  
  // Fetch actor details using admin auth client
  const actorPromises = actorIds.map(id => adminAuthClient.getUserById(id))
  const actorResults = await Promise.all(actorPromises)
  const actors = actorResults
    .filter(result => result.data?.user !== null)
    .map(result => {
      const user = result.data.user!
      return {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    })

  console.log('Actors from DB:', actors)

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
  const agentPromises = agentIds.map(id => adminAuthClient.getUserById(id))
  const agentResults = await Promise.all(agentPromises)
  const userDetails = agentResults
    .filter(result => result.data?.user !== null)
    .map(result => {
      const user = result.data.user!
      return {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    })

  // Format agent data
  const formattedAgents = agents?.map(agent => {
    const userInfo = userDetails?.find(u => u.id === agent.id)
    const name = userInfo?.user_metadata?.name
    const email = userInfo?.email || 'unknown@example.com'
    return {
      id: agent.id,
      name: name || email || 'Unknown Agent',
      email,
      team_id: agent.team_id,
      role: agent.role,
      displayName: `${name || 'Unknown'} (${agent.role}${agent.team_id ? ' - ' + (teams?.find(t => t.id === agent.team_id)?.name || '') : ''})`
    }
  }) || []

  // Format history entries
  const formattedHistory = (history || []).map(entry => {
    const actor = actors?.find(a => a.id === entry.actor_id)
    console.log('Found actor for entry:', entry.id, actor)
    const actorName = actor?.user_metadata?.name || actor?.email || 'System'
    console.log('Actor name resolved to:', actorName)
    let details = ''
    
    // Format details based on action type
    if (entry.action === 'update') {
      const changes = entry.changes || {}
      if ('status' in changes) {
        details = `Changed status to "${changes.status}"`
      } else if ('priority' in changes) {
        details = `Changed priority to "${changes.priority}"`
      } else if ('team_id' in changes) {
        const teamName = teams?.find(t => t.id === changes.team_id)?.name
        details = `Assigned to team "${teamName || changes.team_id}"`
      } else if ('assigned_agent_id' in changes) {
        // Find agent details in the userDetails array since we already fetched them
        const agentUser = userDetails?.find(u => u.id === changes.assigned_agent_id)
        details = `Assigned to agent "${agentUser?.user_metadata?.name || agentUser?.email || changes.assigned_agent_id}"`
      } else if ('tags' in changes) {
        const tagList = Array.isArray(changes.tags) ? changes.tags.join(', ') : changes.tags
        details = `Updated tags to [${tagList}]`
      } else {
        // Fallback for other updates
        details = Object.entries(changes)
          .map(([key, value]) => `Updated ${key.replace('_', ' ')} to "${value}"`)
          .join(', ')
      }
    } else if (entry.action === 'add_response') {
      if (entry.changes?.is_internal) {
        details = 'Added internal note: '
      } else {
        details = 'Added response: '
      }
      if (entry.changes?.content) {
        details += entry.changes.content.slice(0, 100)
        if (entry.changes.content.length > 100) {
          details += '...'
        }
      }
    }

    return {
      id: entry.id,
      actor: actorName,
      action: entry.action,
      timestamp: entry.created_at,
      details
    }
  })

  // Get assigned agent details if present
  let assignedAgentDetails = null
  if (ticket?.assigned_agent_id) {
    const { data: agentResult } = await adminAuthClient.getUserById(ticket.assigned_agent_id)
    
    if (agentResult?.user) {
      assignedAgentDetails = {
        ...ticket.assigned_agent,
        email: agentResult.user.email || 'unknown@example.com',
        name: agentResult.user.user_metadata?.name || agentResult.user.email
      }
    }
  }

  // Combine all the data
  const ticketData = {
    ...ticket,
    assigned_agent: assignedAgentDetails,
    responses: responsesWithAuthors.map(response => ({
      ...response,
      author: response.author ? {
        ...response.author,
        email: response.author.email || 'unknown@example.com',
        user_metadata: {
          ...response.author.user_metadata,
          name: response.author.user_metadata?.name || response.author.email
        }
      } : null
    })),
    history: formattedHistory,
    tags: ticket.tags || []
  }

  return (
    <>
      <TicketDetailWrapper
        ticket={ticketData}
        teams={teams || []}
        agents={formattedAgents}
        currentUserId={user.id}
        ticketId={id}
      />
      
      <TicketSatisfactionSection 
        ticketId={ticketData.id}
        status={ticketData.status}
        satisfactionScore={ticketData.satisfaction_score}
      />
    </>
  )
} 