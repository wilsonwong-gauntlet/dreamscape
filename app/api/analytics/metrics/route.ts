import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

    // Get tickets within the period
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())

    if (ticketsError) throw ticketsError

    // Debug logging
    console.log('Total tickets found:', tickets?.length)
    console.log('Tickets:', tickets?.map(t => ({
      id: t.id,
      title: t.title,
      ai_suggested_response: t.ai_suggested_response,
      created_at: t.created_at
    })))

    // Get active teams and agents
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        agents (
          id,
          status
        )
      `)

    if (teamsError) throw teamsError

    // Calculate metrics
    const totalTickets = tickets?.length || 0
    const resolvedTickets = tickets?.filter(t => t.status === 'resolved').length || 0
    
    // Calculate average resolution time
    const resolutionTimes = tickets
      ?.filter(t => t.resolved_at)
      .map(ticket => {
        const created = new Date(ticket.created_at)
        const resolved = new Date(ticket.resolved_at)
        return (resolved.getTime() - created.getTime()) / (1000 * 60) // minutes
      }) || []
    
    const averageResolutionTime = resolutionTimes.length
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0

    // Calculate customer satisfaction
    const ratedTickets = tickets?.filter(t => t.satisfaction_rating) || []
    const customerSatisfaction = ratedTickets.length
      ? (ratedTickets.reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0) / ratedTickets.length) * 20 // Convert 1-5 to percentage
      : 0

    // Calculate active teams and agents
    const activeTeams = teams?.length || 0
    const totalAgents = teams?.reduce((sum, team) => 
      sum + (team.agents?.filter(a => a.status === 'active').length || 0), 
      0
    ) || 0

    // Calculate AI assist metrics
    const aiMetrics = tickets?.reduce((acc, ticket) => {
      if (ticket.ai_suggested_response) {
        acc.suggestedCount++;
        if (ticket.ai_response_used) {
          acc.usedCount++;
        }
        if (ticket.ai_confidence_score) {
          acc.totalConfidence += ticket.ai_confidence_score;
          acc.confidenceCount++;
        }
        acc.totalInteractions += ticket.ai_interaction_count || 0;
      }
      return acc;
    }, {
      suggestedCount: 0,
      usedCount: 0,
      totalConfidence: 0,
      confidenceCount: 0,
      totalInteractions: 0
    });

    // Debug logging
    console.log('AI Metrics:', {
      totalTickets,
      suggestedCount: aiMetrics.suggestedCount,
      aiAssistRate: totalTickets ? (aiMetrics.suggestedCount / totalTickets) * 100 : 0
    });

    // Calculate rates and averages
    const aiAssistRate = totalTickets ? (aiMetrics.suggestedCount / totalTickets) * 100 : 0;
    const aiSuccessRate = aiMetrics.suggestedCount ? (aiMetrics.usedCount / aiMetrics.suggestedCount) * 100 : 0;
    const aiAvgConfidence = aiMetrics.confidenceCount ? aiMetrics.totalConfidence / aiMetrics.confidenceCount : 0;
    const aiAvgInteractions = aiMetrics.suggestedCount ? aiMetrics.totalInteractions / aiMetrics.suggestedCount : 0;

    return NextResponse.json({
      totalTickets,
      resolvedTickets,
      averageResolutionTime,
      customerSatisfaction,
      activeTeams,
      totalAgents,
      aiAssistRate,
      aiSuccessRate,
      aiAvgConfidence,
      aiAvgInteractions,
      aiMetrics: {
        assistRate: aiAssistRate,
        successRate: aiSuccessRate,
        avgConfidence: aiAvgConfidence,
        avgInteractions: aiAvgInteractions,
        totalSuggested: aiMetrics.suggestedCount,
        totalUsed: aiMetrics.usedCount
      }
    })
  } catch (error) {
    console.error('Error fetching analytics metrics:', error)
    return new NextResponse('Error fetching analytics metrics', { status: 500 })
  }
} 