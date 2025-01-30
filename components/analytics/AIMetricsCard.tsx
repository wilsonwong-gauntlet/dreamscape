'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface AIMetrics {
  assistRate: number
  successRate: number
  avgConfidence: number
  avgInteractions: number
  totalSuggested: number
  totalUsed: number
}

interface AIMetricsCardProps {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly'
}

export function AIMetricsCard({ period }: AIMetricsCardProps) {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetch(`/api/analytics/metrics?period=${period}`)
        if (!res.ok) throw new Error('Failed to fetch metrics')
        const data = await res.json()
        console.log('AI Metrics API Response:', data)
        setMetrics(data.aiMetrics)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading metrics')
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [period])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>AI Assistance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>AI Assistance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (!metrics) return null

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Assistance Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>AI Usage Rate</span>
            <span>{metrics.assistRate.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.assistRate} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>AI Confidence</span>
            <span>{metrics.avgConfidence.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.avgConfidence} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">Avg. Confidence</div>
            <div className="text-2xl">{metrics.avgConfidence.toFixed(1)}%</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm font-medium">Avg. Interactions</div>
            <div className="text-2xl">{metrics.avgInteractions.toFixed(1)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Total AI Responses: </span>
            {metrics.totalUsed}
          </div>
          <div>
            <span className="font-medium">Total Tickets: </span>
            {metrics.totalSuggested}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 