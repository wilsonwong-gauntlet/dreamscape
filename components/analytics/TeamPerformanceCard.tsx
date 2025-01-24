"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { StarIcon } from "@heroicons/react/24/solid"
import React from "react"

interface TeamPerformanceCardProps {
  period: "daily" | "weekly" | "monthly" | "quarterly"
}

export function TeamPerformanceCard({ period }: TeamPerformanceCardProps) {
  const [teams, setTeams] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadTeams() {
      try {
        const res = await fetch(`/api/analytics/teams?period=${period}`)
        if (!res.ok) throw new Error('Failed to fetch teams')
        const data = await res.json()
        setTeams(data)
      } catch (error) {
        console.error('Error loading teams:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTeams()
  }, [period])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
      <div className="grid gap-4">
        {teams.map((team) => (
          <div key={team.id} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">{team.name}</h4>
              <div className="text-sm text-gray-500">
                {team.metrics.period.total} tickets
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {/* Resolution Rate */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Resolution Rate</div>
                <Progress 
                  value={team.metrics.period.resolutionRate} 
                  className="h-2"
                />
                <div className="text-sm mt-1">
                  {team.metrics.period.resolutionRate.toFixed(1)}%
                </div>
              </div>
              
              {/* Average Resolution Time */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Avg Resolution</div>
                <Progress 
                  value={Math.min((team.metrics.period.avgResolutionTime / 120) * 100, 100)} 
                  className={cn(
                    "h-2",
                    team.metrics.period.avgResolutionTime > 120 && "bg-red-100 [&>div]:bg-red-500"
                  )}
                />
                <div className="text-sm mt-1">
                  {team.metrics.period.avgResolutionTime.toFixed(0)} min
                </div>
              </div>

              {/* Customer Satisfaction */}
              <div>
                <div className="text-sm text-gray-500 mb-1">CSAT</div>
                {team.metrics.period.satisfactionResponses > 0 ? (
                  <>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                          key={star}
                          className={cn(
                            "h-4 w-4",
                            star <= team.metrics.period.customerSatisfaction
                              ? "text-yellow-400"
                              : "text-gray-200"
                          )}
                        />
                      ))}
                    </div>
                    <div className="text-sm mt-1">
                      {team.metrics.period.customerSatisfaction.toFixed(1)} ({team.metrics.period.satisfactionResponses} responses)
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 mt-3">No responses yet</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
} 