import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

interface HistoricalMetrics {
  totalTickets: number
  resolvedTickets: number
  averageResolutionTime: number
  customerSatisfaction: number
  aiAssistRate: number
  period_start: string
  period_end: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'weekly'
  
  const supabase = await createClient()

  try {
    // Get historical data for the last 3 periods
    const now = new Date()
    let startDate = new Date()
    const periodLengths = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90
    } as const;

    const periodLength = periodLengths[period as keyof typeof periodLengths] || 7; // default to weekly
    
    startDate.setDate(now.getDate() - (periodLength * 3))

    const { data: history, error: historyError } = await supabase
      .from('team_performance_history')
      .select('*')
      .gte('period_start', startDate.toISOString())
      .lte('period_end', now.toISOString())
      .order('period_start', { ascending: true })

    if (historyError) throw historyError

    // Group metrics by period
    const historicalMetrics: HistoricalMetrics[] = history?.map(h => ({
      totalTickets: h.metrics.totalTickets,
      resolvedTickets: h.metrics.resolvedTickets,
      averageResolutionTime: h.metrics.averageResolutionTime,
      customerSatisfaction: h.metrics.customerSatisfaction,
      aiAssistRate: h.metrics.aiAssistRate,
      period_start: h.period_start,
      period_end: h.period_end
    })) || []

    // Calculate trends and make predictions
    const predictions = []

    // Predict ticket volume
    if (historicalMetrics.length >= 2) {
      const ticketTrend = historicalMetrics.map(m => m.totalTickets)
      const avgChange = ticketTrend.slice(1).reduce((sum, curr, i) => 
        sum + (curr - ticketTrend[i]), 0
      ) / (ticketTrend.length - 1)

      const currentTickets = ticketTrend[ticketTrend.length - 1]
      const predictedTickets = Math.max(0, Math.round(currentTickets + avgChange))
      
      const confidence = calculateConfidence(ticketTrend)
      
      predictions.push({
        metric: 'Ticket Volume',
        currentValue: currentTickets,
        predictedValue: predictedTickets,
        confidence,
        factors: [
          `${avgChange > 0 ? 'Increasing' : 'Decreasing'} trend over last ${historicalMetrics.length} periods`,
          `Average change of ${Math.abs(Math.round(avgChange))} tickets per period`,
          'Seasonal patterns may affect accuracy'
        ],
        recommendations: [
          avgChange > 0 
            ? 'Consider increasing support staff capacity'
            : 'Opportunity to focus on quality improvements',
          'Review successful self-service initiatives',
          'Analyze peak hours for optimal staffing'
        ]
      })
    }

    // Predict resolution time
    if (historicalMetrics.length >= 2) {
      const timeTrend = historicalMetrics.map(m => m.averageResolutionTime)
      const avgChange = timeTrend.slice(1).reduce((sum, curr, i) => 
        sum + (curr - timeTrend[i]), 0
      ) / (timeTrend.length - 1)

      const currentTime = timeTrend[timeTrend.length - 1]
      const predictedTime = Math.max(0, Math.round(currentTime + avgChange))
      
      const confidence = calculateConfidence(timeTrend)
      
      predictions.push({
        metric: 'Resolution Time',
        currentValue: currentTime,
        predictedValue: predictedTime,
        confidence,
        factors: [
          `${avgChange > 0 ? 'Increasing' : 'Decreasing'} resolution times`,
          `Average change of ${Math.abs(Math.round(avgChange))} minutes per period`,
          'Current AI assist rate affects efficiency'
        ],
        recommendations: [
          avgChange > 0 
            ? 'Review and optimize support workflows'
            : 'Document successful process improvements',
          'Increase AI-assisted responses for common issues',
          'Identify bottlenecks in resolution process'
        ]
      })
    }

    // Predict customer satisfaction
    if (historicalMetrics.length >= 2) {
      const satTrend = historicalMetrics.map(m => m.customerSatisfaction)
      const avgChange = satTrend.slice(1).reduce((sum, curr, i) => 
        sum + (curr - satTrend[i]), 0
      ) / (satTrend.length - 1)

      const currentSat = satTrend[satTrend.length - 1]
      const predictedSat = Math.min(100, Math.max(0, currentSat + avgChange))
      
      const confidence = calculateConfidence(satTrend)
      
      predictions.push({
        metric: 'Customer Satisfaction',
        currentValue: currentSat,
        predictedValue: predictedSat,
        confidence,
        factors: [
          `${avgChange > 0 ? 'Improving' : 'Declining'} satisfaction trend`,
          `Average change of ${Math.abs(Number(avgChange.toFixed(1)))}% per period`,
          'Resolution time correlation detected'
        ],
        recommendations: [
          avgChange > 0 
            ? 'Document and replicate successful practices'
            : 'Review recent negative feedback patterns',
          'Enhance AI response quality for common issues',
          'Consider additional customer feedback channels'
        ]
      })
    }

    return NextResponse.json(predictions)
  } catch (error) {
    console.error('Error generating analytics predictions:', error)
    return new NextResponse('Error generating analytics predictions', { status: 500 })
  }
}

function calculateConfidence(trend: number[]): number {
  if (trend.length < 2) return 0
  
  // Calculate variance in the trend
  const mean = trend.reduce((a, b) => a + b, 0) / trend.length
  const variance = trend.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / trend.length
  
  // Calculate coefficient of variation (CV)
  const cv = Math.sqrt(variance) / mean
  
  // Convert CV to confidence score (lower CV = higher confidence)
  const confidence = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)))
  
  // Adjust confidence based on sample size
  return Math.round(confidence * (trend.length / 4)) // Max confidence at 4+ periods
} 