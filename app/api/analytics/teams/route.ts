import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams
    const period = searchParams.get('period') || 'daily'

    // Calculate start date based on period
    const now = new Date()
    const startDate = new Date()
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

    const supabase = await createClient()

    // Fetch metrics from the team_metrics view
    const { data: teamMetrics, error: metricsError } = await supabase
      .from('team_metrics')
      .select('*')

    if (metricsError) {
      console.error('Error fetching team metrics:', metricsError)
      return NextResponse.json({ error: 'Failed to fetch team metrics' }, { status: 500 })
    }

    // Fetch recent tickets for period-specific metrics
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, team_id, status, created_at, updated_at, satisfaction_score')
      .gte('created_at', startDate.toISOString())

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError)
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    // Calculate period metrics for each team
    const teamPeriodMetrics = tickets.reduce((acc: any, ticket) => {
      if (!acc[ticket.team_id]) {
        acc[ticket.team_id] = {
          totalTickets: 0,
          resolvedTickets: 0,
          totalResolutionTime: 0,
          satisfactionScores: [],
        }
      }

      acc[ticket.team_id].totalTickets++
      
      if (ticket.status === 'resolved') {
        acc[ticket.team_id].resolvedTickets++
        const resolutionTime = new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime()
        acc[ticket.team_id].totalResolutionTime += resolutionTime
      }

      if (ticket.satisfaction_score) {
        acc[ticket.team_id].satisfactionScores.push(ticket.satisfaction_score)
      }

      return acc
    }, {})

    // Combine overall and period metrics
    const combinedMetrics = teamMetrics.map((team: any) => {
      const periodMetrics = teamPeriodMetrics[team.team_id] || {
        totalTickets: 0,
        resolvedTickets: 0,
        totalResolutionTime: 0,
        satisfactionScores: [],
      }

      const avgResolutionTime = periodMetrics.resolvedTickets > 0
        ? periodMetrics.totalResolutionTime / periodMetrics.resolvedTickets / (1000 * 60) // Convert to minutes
        : 0

      const periodSatisfaction = periodMetrics.satisfactionScores.length > 0
        ? periodMetrics.satisfactionScores.reduce((a: number, b: number) => a + b, 0) / periodMetrics.satisfactionScores.length
        : 0

      return {
        id: team.team_id,
        name: team.team_name,
        metrics: {
          total: team.total_tickets,
          resolved: team.resolved_tickets,
          resolutionRate: team.resolved_tickets / (team.total_tickets || 1) * 100,
          customerSatisfaction: team.avg_satisfaction || 0,
          satisfactionResponses: team.satisfaction_responses,
          period: {
            total: periodMetrics.totalTickets,
            resolved: periodMetrics.resolvedTickets,
            resolutionRate: periodMetrics.resolvedTickets / (periodMetrics.totalTickets || 1) * 100,
            avgResolutionTime,
            customerSatisfaction: periodSatisfaction,
            satisfactionResponses: periodMetrics.satisfactionScores.length
          }
        }
      }
    })

    return NextResponse.json(combinedMetrics)
  } catch (error) {
    console.error('Error in teams analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 