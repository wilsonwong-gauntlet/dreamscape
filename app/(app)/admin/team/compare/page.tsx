'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowUp, ArrowDown, BarChart3, Clock, Star, Percent } from "lucide-react"
import { toast } from "sonner"

interface TeamMetrics {
  teamId: string
  teamName: string
  metrics: {
    totalTickets: number
    ticketsPerAgent: number
    resolutionRate: number
    reopenRate: number
    averageResponseTime: number
    activeAgents: number
  }
  historical: Array<{
    period_start: string
    period_end: string
    metrics: Record<string, number>
  }>
}

interface ComparisonData {
  teams: TeamMetrics[]
  rankings: Record<string, Array<{ teamId: string; teamName: string; value: number }>>
  averages: Record<string, number>
  period: {
    start: string
    end: string
  }
}

export default function TeamComparisonPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [allTeams, setAllTeams] = useState<{ id: string; name: string }[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load all teams for selection
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await fetch('/api/teams')
        if (!response.ok) throw new Error('Failed to load teams')
        const data = await response.json()
        setAllTeams(data)
      } catch (error) {
        console.error('Error loading teams:', error)
        toast.error('Failed to load teams')
      }
    }

    loadTeams()
  }, [])

  // Load comparison data when teams or period changes
  useEffect(() => {
    const loadComparison = async () => {
      if (selectedTeams.length === 0) {
        setComparisonData(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const metrics = [
          'totalTickets',
          'ticketsPerAgent',
          'resolutionRate',
          'reopenRate',
          'averageResponseTime',
          'activeAgents'
        ]
        
        const response = await fetch(
          `/api/teams/performance/compare?teams=${selectedTeams.join(',')}&period=${period}&metrics=${metrics.join(',')}`
        )
        
        if (!response.ok) throw new Error('Failed to load comparison data')
        const data = await response.json()
        setComparisonData(data)
      } catch (error) {
        console.error('Error loading comparison:', error)
        toast.error('Failed to load comparison data')
      } finally {
        setIsLoading(false)
      }
    }

    loadComparison()
  }, [selectedTeams, period])

  const getChangeIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100
    if (change > 0) {
      return <ArrowUp className="h-4 w-4 text-green-500" />
    } else if (change < 0) {
      return <ArrowDown className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const formatMetricValue = (metric: string, value: number) => {
    switch (metric) {
      case 'averageResponseTime':
        return `${Math.round(value)}m`
      case 'resolutionRate':
      case 'reopenRate':
        return `${value.toFixed(1)}%`
      case 'ticketsPerAgent':
        return value.toFixed(1)
      default:
        return Math.round(value).toString()
    }
  }

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'totalTickets':
        return <BarChart3 className="h-4 w-4" />
      case 'averageResponseTime':
        return <Clock className="h-4 w-4" />
      case 'resolutionRate':
        return <Percent className="h-4 w-4" />
      case 'customerSatisfaction':
        return <Star className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Team Comparison</h1>
          <p className="text-muted-foreground">
            Compare performance metrics across teams
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Selection */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Select Teams to Compare</CardTitle>
          <CardDescription>Choose two or more teams to compare their performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allTeams.map(team => (
              <Button
                key={team.id}
                variant={selectedTeams.includes(team.id) ? "default" : "outline"}
                onClick={() => {
                  setSelectedTeams(prev => 
                    prev.includes(team.id)
                      ? prev.filter(id => id !== team.id)
                      : [...prev, team.id]
                  )
                }}
              >
                {team.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : comparisonData ? (
        <div className="space-y-6">
          {/* Metrics Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Comparison</CardTitle>
              <CardDescription>
                Side-by-side comparison of key metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    {comparisonData.teams.map(team => (
                      <TableHead key={team.teamId}>{team.teamName}</TableHead>
                    ))}
                    <TableHead>Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(comparisonData.teams[0]?.metrics || {}).map(([metric, _]) => (
                    <TableRow key={metric}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {getMetricIcon(metric)}
                        {metric.replace(/([A-Z])/g, ' $1').trim()}
                      </TableCell>
                      {comparisonData.teams.map(team => (
                        <TableCell key={team.teamId}>
                          <div className="flex items-center gap-2">
                            {formatMetricValue(metric, team.metrics[metric as keyof typeof team.metrics])}
                            {team.historical[0] && getChangeIndicator(
                              team.metrics[metric as keyof typeof team.metrics],
                              team.historical[0].metrics[metric]
                            )}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-muted-foreground">
                        {formatMetricValue(metric, comparisonData.averages[metric])}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Rankings */}
          <Card>
            <CardHeader>
              <CardTitle>Rankings</CardTitle>
              <CardDescription>
                How teams rank in different metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(comparisonData.rankings).map(([metric, rankings]) => (
                  <div key={metric} className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2">
                      {getMetricIcon(metric)}
                      {metric.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <div className="space-y-1">
                      {rankings.map((rank, index) => (
                        <div key={rank.teamId} className="flex items-center justify-between">
                          <span className="text-sm">
                            {index + 1}. {rank.teamName}
                          </span>
                          <Badge variant="outline">
                            {formatMetricValue(metric, rank.value)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Select teams above to see comparison data
          </CardContent>
        </Card>
      )}
    </div>
  )
} 