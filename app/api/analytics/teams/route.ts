import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'daily'

    const supabase = await createClient()

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

    // Fetch all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')

    if (teamsError) throw teamsError

    // Fetch tickets for each team
    const teamMetrics = await Promise.all(
      teams.map(async (team) => {
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('id, status, created_at, updated_at')
          .eq('team_id', team.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', now.toISOString())

        if (ticketsError) throw ticketsError

        const resolvedTickets = tickets.filter(t => t.status === 'resolved')
        const resolutionRate = tickets.length > 0 
          ? (resolvedTickets.length / tickets.length) * 100 
          : 0

        // Calculate average resolution time using updated_at for resolved tickets
        const resolutionTimes = resolvedTickets
          .map(ticket => {
            const created = new Date(ticket.created_at)
            const resolved = new Date(ticket.updated_at)
            return (resolved.getTime() - created.getTime()) / (1000 * 60) // Convert to minutes
          })
          .filter((time): time is number => !isNaN(time))

        const averageResolutionTime = resolutionTimes.length > 0
          ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
          : 0

        // For now, return placeholder satisfaction score until we add the column
        const customerSatisfaction = 0

        return {
          id: team.id,
          name: team.name,
          ticketCount: tickets.length,
          resolutionRate,
          averageResolutionTime,
          customerSatisfaction
        }
      })
    )

    return NextResponse.json({ teams: teamMetrics })
  } catch (error) {
    console.error('Error fetching team metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team metrics' },
      { status: 500 }
    )
  }
} 