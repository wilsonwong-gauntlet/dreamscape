'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TeamMetrics {
  id: string
  name: string
  ticketCount: number
  resolutionRate: number
  averageResolutionTime: number
  customerSatisfaction: number
}

interface TeamPerformanceCardProps {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly'
}

export function TeamPerformanceCard({ period }: TeamPerformanceCardProps) {
  const [teams, setTeams] = useState<TeamMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTeams() {
      try {
        const res = await fetch(`/api/analytics/teams?period=${period}`)
        if (!res.ok) throw new Error('Failed to fetch team metrics')
        const data = await res.json()
        setTeams(data.teams)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading team metrics')
      } finally {
        setLoading(false)
      }
    }

    loadTeams()
  }, [period])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
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
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (!teams.length) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          No team data available for this period
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {teams.map(team => (
          <div key={team.id} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">{team.name}</h3>
              <span className="text-sm text-muted-foreground">
                {team.ticketCount} tickets
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Resolution</span>
                  <span>{team.resolutionRate.toFixed(1)}%</span>
                </div>
                <Progress value={team.resolutionRate} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Avg Time</span>
                  <span>{Math.round(team.averageResolutionTime)}m</span>
                </div>
                <Progress 
                  value={(team.averageResolutionTime / 120) * 100} 
                  className="h-2" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>CSAT</span>
                  <span>
                    {team.customerSatisfaction > 0 
                      ? `${team.customerSatisfaction.toFixed(1)}%`
                      : 'No data'
                    }
                  </span>
                </div>
                <Progress 
                  value={team.customerSatisfaction} 
                  className={cn(
                    "h-2",
                    team.customerSatisfaction === 0 && "opacity-50"
                  )} 
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 