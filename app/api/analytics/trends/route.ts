import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

interface MetricTrend {
  metric: string
  value: number
  change: number
  status: 'up' | 'down' | 'neutral'
  insight: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'weekly'
  
  const supabase = await createClient()

  try {
    // Get historical data for the last 2 periods
    const now = new Date()
    let startDate = new Date()
    const periodLengths: Record<string, number> = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90
    }
    const periodLength = periodLengths[period] || 7 // Default to weekly
    
    startDate.setDate(now.getDate() - (periodLength * 2))

    const { data: history, error: historyError } = await supabase
      .from('team_performance_history')
      .select('*')
      .gte('period_start', startDate.toISOString())
      .lte('period_end', now.toISOString())
      .order('period_start', { ascending: true })

    if (historyError) throw historyError

    const trends: MetricTrend[] = []

    if (history && history.length >= 2) {
      const current = history[history.length - 1].metrics
      const previous = history[history.length - 2].metrics

      // Analyze ticket volume trend
      const ticketChange = ((current.totalTickets - previous.totalTickets) / previous.totalTickets) * 100
      trends.push({
        metric: 'Ticket Volume',
        value: current.totalTickets,
        change: ticketChange,
        status: ticketChange > 0 ? 'up' : ticketChange < 0 ? 'down' : 'neutral',
        insight: generateTicketVolumeInsight(current, previous)
      })

      // Analyze resolution time trend
      const timeChange = ((current.averageResolutionTime - previous.averageResolutionTime) / previous.averageResolutionTime) * 100
      trends.push({
        metric: 'Resolution Time',
        value: current.averageResolutionTime,
        change: timeChange,
        status: timeChange > 0 ? 'down' : timeChange < 0 ? 'up' : 'neutral', // Inverse because lower is better
        insight: generateResolutionTimeInsight(current, previous)
      })

      // Analyze customer satisfaction trend
      const satChange = ((current.customerSatisfaction - previous.customerSatisfaction) / previous.customerSatisfaction) * 100
      trends.push({
        metric: 'Customer Satisfaction',
        value: current.customerSatisfaction,
        change: satChange,
        status: satChange > 0 ? 'up' : satChange < 0 ? 'down' : 'neutral',
        insight: generateSatisfactionInsight(current, previous)
      })

      // Analyze AI assistance trend
      const aiChange = ((current.aiAssistRate - previous.aiAssistRate) / previous.aiAssistRate) * 100
      trends.push({
        metric: 'AI Assistance',
        value: current.aiAssistRate,
        change: aiChange,
        status: aiChange > 0 ? 'up' : aiChange < 0 ? 'down' : 'neutral',
        insight: generateAIAssistInsight(current, previous)
      })
    }

    return NextResponse.json(trends)
  } catch (error) {
    console.error('Error analyzing trends:', error)
    return new NextResponse('Error analyzing trends', { status: 500 })
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