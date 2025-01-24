import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

interface MetricTrend {
  metric: string
  value: number
  change: number
  status: 'up' | 'down' | 'neutral'
  insight: string
}

interface PeriodData {
  period: string
  totalTickets: number
  resolvedTickets: number
  satisfactionScores: number[]
  resolutionTimes: number[]
}

interface PeriodDataMap {
  [key: string]: PeriodData
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams
    const period = searchParams.get('period') || 'weekly'
    const teamId = searchParams.get('teamId')

    // Calculate date range based on period
    const now = new Date()
    const startDate = new Date()
    let intervals = 12 // Default to 12 data points

    switch (period) {
      case 'daily':
        startDate.setDate(now.getDate() - 14) // 2 weeks of daily data
        intervals = 14
        break
      case 'weekly':
        startDate.setDate(now.getDate() - 84) // 12 weeks of weekly data
        break
      case 'monthly':
        startDate.setMonth(now.getMonth() - 12) // 12 months of monthly data
        break
      case 'quarterly':
        startDate.setMonth(now.getMonth() - 36) // 12 quarters of quarterly data
        break
    }

    const supabase = await createClient()

    // Fetch historical data
    const query = supabase
      .from('team_performance_history')
      .select('*')
      .gte('period_start', startDate.toISOString())
      .order('period_start', { ascending: true })

    if (teamId) {
      query.eq('team_id', teamId)
    }

    const { data: history, error: historyError } = await query

    if (historyError) {
      console.error('Error fetching performance history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch performance history' },
        { status: 500 }
      )
    }

    // If no historical data, fetch and calculate from tickets table
    if (!history || history.length === 0) {
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, team_id, status, created_at, updated_at, satisfaction_score')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError)
        return NextResponse.json(
          { error: 'Failed to fetch tickets' },
          { status: 500 }
        )
      }

      // Group tickets by period and calculate metrics
      const periodData = tickets.reduce((acc: PeriodDataMap, ticket) => {
        const ticketDate = new Date(ticket.created_at)
        let periodKey: string

        switch (period) {
          case 'daily':
            periodKey = ticketDate.toISOString().split('T')[0]
            break
          case 'weekly':
            const week = Math.floor(ticketDate.getDate() / 7)
            periodKey = `${ticketDate.getFullYear()}-W${week}`
            break
          case 'monthly':
            periodKey = `${ticketDate.getFullYear()}-${ticketDate.getMonth() + 1}`
            break
          case 'quarterly':
            const quarter = Math.floor(ticketDate.getMonth() / 3) + 1
            periodKey = `${ticketDate.getFullYear()}-Q${quarter}`
            break
          default:
            periodKey = ticketDate.toISOString().split('T')[0]
        }

        if (!acc[periodKey]) {
          acc[periodKey] = {
            period: periodKey,
            totalTickets: 0,
            resolvedTickets: 0,
            satisfactionScores: [],
            resolutionTimes: []
          }
        }

        acc[periodKey].totalTickets++

        if (ticket.status === 'resolved') {
          acc[periodKey].resolvedTickets++
          const resolutionTime = new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime()
          acc[periodKey].resolutionTimes.push(resolutionTime)
        }

        if (ticket.satisfaction_score) {
          acc[periodKey].satisfactionScores.push(ticket.satisfaction_score)
        }

        return acc
      }, {})

      // Calculate final metrics for each period
      const trends = Object.values(periodData).map((period: PeriodData) => ({
        period: period.period,
        metrics: {
          total: period.totalTickets,
          resolved: period.resolvedTickets,
          resolutionRate: (period.resolvedTickets / period.totalTickets) * 100,
          avgResolutionTime: period.resolutionTimes.length > 0
            ? period.resolutionTimes.reduce((a: number, b: number) => a + b, 0) / period.resolutionTimes.length / (1000 * 60) // Convert to minutes
            : 0,
          customerSatisfaction: period.satisfactionScores.length > 0
            ? period.satisfactionScores.reduce((a: number, b: number) => a + b, 0) / period.satisfactionScores.length
            : 0,
          satisfactionResponses: period.satisfactionScores.length
        }
      }))

      return NextResponse.json(trends)
    }

    // Use historical data if available
    const trends = history.map(entry => ({
      period: entry.period_start,
      metrics: entry.metrics
    }))

    return NextResponse.json(trends)
  } catch (error) {
    console.error('Error in trends endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateTicketVolumeInsight(current: any, previous: any): string {
  const volumeChange = current.totalTickets - previous.totalTickets
  const resolutionRateChange = 
    (current.resolvedTickets / current.totalTickets) - 
    (previous.resolvedTickets / previous.totalTickets)

  if (volumeChange > 0 && resolutionRateChange > 0) {
    return "Ticket volume is increasing, but the team is maintaining improved resolution rates. This suggests effective scaling of support operations."
  } else if (volumeChange > 0 && resolutionRateChange < 0) {
    return "Increasing ticket volume is impacting resolution rates. Consider reviewing team capacity and support processes."
  } else if (volumeChange < 0 && resolutionRateChange > 0) {
    return "Decreased ticket volume with improved resolution rates indicates successful self-service initiatives or proactive support measures."
  } else {
    return "Stable ticket volume suggests consistent customer engagement. Focus on optimizing current processes."
  }
}

function generateResolutionTimeInsight(current: any, previous: any): string {
  const timeChange = current.averageResolutionTime - previous.averageResolutionTime
  const aiRateChange = current.aiAssistRate - previous.aiAssistRate

  if (timeChange < 0 && aiRateChange > 0) {
    return "Improved resolution times correlate with increased AI assistance. Continue leveraging AI for common issues."
  } else if (timeChange > 0 && aiRateChange > 0) {
    return "Despite increased AI usage, resolution times are rising. Review complex cases and identify bottlenecks."
  } else if (timeChange < 0) {
    return "Faster resolution times indicate improved team efficiency. Document and share successful practices."
  } else {
    return "Resolution times are increasing. Consider additional training or process optimization."
  }
}

function generateSatisfactionInsight(current: any, previous: any): string {
  const satChange = current.customerSatisfaction - previous.customerSatisfaction
  const timeChange = current.averageResolutionTime - previous.averageResolutionTime

  if (satChange > 0 && timeChange < 0) {
    return "Improved satisfaction correlates with faster resolutions. Current support strategy is effective."
  } else if (satChange < 0 && timeChange > 0) {
    return "Declining satisfaction may be linked to longer resolution times. Focus on speed and communication."
  } else if (satChange > 0) {
    return "Customer satisfaction is improving despite other metrics. Identify and replicate successful practices."
  } else {
    return "Review recent customer feedback to identify areas for improvement in service quality."
  }
}

function generateAIAssistInsight(current: any, previous: any): string {
  const aiChange = current.aiAssistRate - previous.aiAssistRate
  const satChange = current.customerSatisfaction - previous.customerSatisfaction

  if (aiChange > 0 && satChange > 0) {
    return "Increased AI assistance is positively impacting customer satisfaction. Continue expanding AI capabilities."
  } else if (aiChange > 0 && satChange < 0) {
    return "While AI usage is up, satisfaction has declined. Review AI response quality and human handoff processes."
  } else if (aiChange < 0) {
    return "Decreased AI assistance rate. Evaluate if certain types of issues are bypassing AI or if adjustments are needed."
  } else {
    return "Stable AI assistance rate. Look for opportunities to expand AI coverage to new types of issues."
  }
} 