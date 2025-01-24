'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"
import { Loader2, Clock, Users, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface OverviewMetrics {
  totalTickets: number
  resolvedTickets: number
  averageResolutionTime: number
  customerSatisfaction: number
  activeTeams: number
  totalAgents: number
}

interface OverviewMetricsCardProps {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly'
}

export function OverviewMetricsCard({ period }: OverviewMetricsCardProps) {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetch(`/api/analytics/metrics?period=${period}`)
        if (!res.ok) throw new Error('Failed to fetch metrics')
        const data = await res.json()
        setMetrics(data)
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
          <CardTitle>Overview Metrics</CardTitle>
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
          <CardTitle>Overview Metrics</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (!metrics) return null

  const resolutionRate = (metrics.resolvedTickets / metrics.totalTickets) * 100

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Overview Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Tickets
              </span>
              <span>{metrics.totalTickets}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {metrics.resolvedTickets} resolved ({resolutionRate.toFixed(1)}%)
            </div>
            <Progress value={resolutionRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg Resolution
              </span>
              <span>{Math.round(metrics.averageResolutionTime)}m</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Target: 120m
            </div>
            <Progress 
              value={(metrics.averageResolutionTime / 120) * 100} 
              className={cn(
                "h-2",
                metrics.averageResolutionTime > 120 && "[&>div]:bg-red-500"
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4" />
                CSAT Score
              </span>
              <span>{metrics.customerSatisfaction.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.customerSatisfaction} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Coverage
              </span>
              <span>{metrics.activeTeams} teams</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {metrics.totalAgents} active agents
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 