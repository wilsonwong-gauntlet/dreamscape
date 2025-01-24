import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'weekly'
  const teamIds = searchParams.get('teams')?.split(',') || []
  const metrics = searchParams.get('metrics')?.split(',') || []
  
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

    // Get historical data for selected teams
    let query = supabase
      .from('team_performance_history')
      .select('*')
      .gte('period_start', startDate.toISOString())
      .lte('period_end', now.toISOString())

    if (teamIds.length > 0) {
      query = query.in('team_id', teamIds)
    }

    const { data: history, error: historyError } = await query

    if (historyError) throw historyError

    // Get current performance for selected teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        agents (
          id,
          status
        )
      `)
      .in(teamIds.length > 0 ? 'id' : 'id', teamIds)

    if (teamsError) throw teamsError

    // Get tickets for selected teams
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .in('team_id', teamIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())

    if (ticketsError) throw ticketsError

    // Calculate metrics for each team
    const teamMetrics = teams.map(team => {
      const teamTickets = tickets?.filter(t => t.team_id === team.id) || []
      const activeAgents = (team.agents || []).filter(a => a.status === 'active').length

      // Calculate basic metrics
      const totalTickets = teamTickets.length
      const resolvedTickets = teamTickets.filter(t => t.status === 'resolved').length
      const reopenedTickets = teamTickets.filter(t => t.reopened_count > 0).length

      // Calculate response times
      const responseTimes = teamTickets
        .map(ticket => {
          const created = new Date(ticket.created_at)
          const firstResponse = ticket.first_response_at 
            ? new Date(ticket.first_response_at)
            : null
          return firstResponse 
            ? (firstResponse.getTime() - created.getTime()) / (1000 * 60)
            : null
        })
        .filter(Boolean) as number[]

      const avgResponseTime = responseTimes.length
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0

      return {
        teamId: team.id,
        teamName: team.name,
        metrics: {
          totalTickets,
          ticketsPerAgent: activeAgents ? totalTickets / activeAgents : 0,
          resolutionRate: totalTickets ? (resolvedTickets / totalTickets) * 100 : 0,
          reopenRate: totalTickets ? (reopenedTickets / totalTickets) * 100 : 0,
          averageResponseTime: avgResponseTime,
          activeAgents
        },
        historical: history?.filter(h => h.team_id === team.id) || []
      }
    })

    // Calculate team rankings
    const rankings = metrics.length > 0 
      ? metrics.reduce((acc, metric) => {
          const sorted = [...teamMetrics].sort((a, b) => {
            const aValue = a.metrics[metric as keyof typeof a.metrics] || 0
            const bValue = b.metrics[metric as keyof typeof b.metrics] || 0
            return bValue - aValue
          })
          
          acc[metric] = sorted.map(t => ({
            teamId: t.teamId,
            teamName: t.teamName,
            value: t.metrics[metric as keyof typeof t.metrics]
          }))
          
          return acc
        }, {} as Record<string, any>)
      : {}

    // Calculate averages
    const averages = Object.keys(teamMetrics[0]?.metrics || {}).reduce((acc, metric) => {
      const values = teamMetrics.map(t => t.metrics[metric as keyof typeof t.metrics])
      acc[metric] = values.reduce((a, b) => a + b, 0) / values.length
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      teams: teamMetrics,
      rankings,
      averages,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      }
    })
  } catch (error) {
    console.error('Error comparing team performance:', error)
    return new NextResponse('Error comparing team performance', { status: 500 })
  }
} 