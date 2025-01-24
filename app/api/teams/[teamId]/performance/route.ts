import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
    const { teamId } = await params
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'weekly'
  const supabase = await createClient()

  try {
    // Get time range based on period
    const now = new Date()
    let startDate = new Date()
    switch (period) {
      case 'daily':
        startDate.setDate(now.getDate() - 1)
        break
      case 'weekly':
        startDate.setDate(now.getDate() - 7)
        break
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarterly':
        startDate.setMonth(now.getMonth() - 3)
        break
    }

    // Get all tickets for the team in the period
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        *,
        agents!inner (
          team_id
        )
      `)
      .eq('agents.team_id', teamId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())

    if (ticketsError) throw ticketsError

    // Get team agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')

    if (agentsError) throw agentsError

    // Calculate metrics
    const totalTickets = tickets?.length || 0
    const activeAgents = agents?.length || 0

    // Calculate response times
    const responseTimes = tickets?.map(ticket => {
      const created = new Date(ticket.created_at)
      const firstResponse = ticket.first_response_at 
        ? new Date(ticket.first_response_at)
        : null
      return firstResponse 
        ? (firstResponse.getTime() - created.getTime()) / (1000 * 60) // minutes
        : null
    }).filter(Boolean) as number[]

    const avgResponseTime = responseTimes.length
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0

    // Calculate response time distribution
    const under1Hour = responseTimes.filter(t => t <= 60).length
    const under4Hours = responseTimes.filter(t => t <= 240).length
    const under24Hours = responseTimes.filter(t => t <= 1440).length

    // Calculate resolution rate
    const resolvedTickets = tickets?.filter(t => t.status === 'resolved').length || 0
    const resolutionRate = totalTickets ? (resolvedTickets / totalTickets) * 100 : 0

    // Calculate reopen rate
    const reopenedTickets = tickets?.filter(t => t.reopened_count > 0).length || 0
    const reopenRate = totalTickets ? (reopenedTickets / totalTickets) * 100 : 0

    // Calculate satisfaction
    const ratedTickets = tickets?.filter(t => t.satisfaction_rating !== null) || []
    const avgSatisfaction = ratedTickets.length
      ? ratedTickets.reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0) / ratedTickets.length
      : 0

    // Calculate current workload
    const activeTickets = tickets?.filter(t => 
      t.status !== 'resolved' && t.status !== 'closed'
    ).length || 0

    const backlogTickets = tickets?.filter(t =>
      t.status === 'open' && !t.assigned_to
    ).length || 0

    // Calculate agent utilization
    const maxTicketsPerAgent = 20 // This should come from team settings
    const currentUtilization = activeAgents 
      ? (activeTickets / (activeAgents * maxTicketsPerAgent)) * 100
      : 0

    const metrics = {
      // Response Times
      averageFirstResponseTime: avgResponseTime,
      responseTimeDistribution: {
        under1Hour: totalTickets ? (under1Hour / totalTickets) * 100 : 0,
        under4Hours: totalTickets ? (under4Hours / totalTickets) * 100 : 0,
        under24Hours: totalTickets ? (under24Hours / totalTickets) * 100 : 0,
        over24Hours: totalTickets 
          ? ((totalTickets - under24Hours) / totalTickets) * 100 
          : 0
      },

      // Volume Metrics
      ticketsHandled: totalTickets,
      ticketsPerAgent: activeAgents ? totalTickets / activeAgents : 0,
      activeTickets,
      backlogTickets,

      // Quality Metrics
      resolutionRate,
      customerSatisfaction: avgSatisfaction,
      reopenRate,

      // Agent Metrics
      agentAvailability: 100, // This should come from agent status tracking
      agentUtilization: currentUtilization,

      // Time Period
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching team performance:', error)
    return new NextResponse('Error fetching team performance', { status: 500 })
  }
} 