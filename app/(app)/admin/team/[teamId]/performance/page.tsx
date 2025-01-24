'use client'

import { useState, useEffect, use } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Clock, 
  Users, 
  BarChart3, 
  Star,
  ArrowUp,
  ArrowDown,
  Percent,
  AlertCircle 
} from "lucide-react"
import { toast } from "sonner"

interface TeamPerformance {
  // Response Times
  averageFirstResponseTime: number
  responseTimeDistribution: {
    under1Hour: number
    under4Hours: number
    under24Hours: number
    over24Hours: number
  }

  // Volume Metrics
  ticketsHandled: number
  ticketsPerAgent: number
  activeTickets: number
  backlogTickets: number

  // Quality Metrics
  resolutionRate: number
  customerSatisfaction: number
  reopenRate: number

  // Agent Metrics
  agentAvailability: number
  agentUtilization: number

  // Time Period
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  startDate: string
  endDate: string
}

export default function TeamPerformancePage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly')
  const [metrics, setMetrics] = useState<TeamPerformance | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await fetch(`/api/teams/${teamId}/performance?period=${period}`)
        if (!response.ok) throw new Error('Failed to load performance metrics')
        const data = await response.json()
        setMetrics(data)
      } catch (error) {
        console.error('Error loading metrics:', error)
        toast.error('Failed to load performance metrics')
      } finally {
        setIsLoading(false)
      }
    }

    loadMetrics()
  }, [teamId, period])

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Team Performance</h1>
          <p className="text-muted-foreground">
            Monitor team metrics, efficiency, and quality
          </p>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Response Time Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.averageFirstResponseTime 
                ? `${Math.round(metrics.averageFirstResponseTime)}m` 
                : '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics?.responseTimeDistribution.under1Hour}% under 1h
            </div>
          </CardContent>
        </Card>

        {/* Volume Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tickets Handled
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.ticketsHandled ?? '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics?.ticketsPerAgent ?? '-'} per agent
            </div>
          </CardContent>
        </Card>

        {/* Satisfaction Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Customer Satisfaction
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.customerSatisfaction 
                ? `${metrics.customerSatisfaction.toFixed(1)}/5.0`
                : '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              Based on {metrics?.ticketsHandled ?? 0} ratings
            </div>
          </CardContent>
        </Card>

        {/* Resolution Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolution Rate
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.resolutionRate 
                ? `${Math.round(metrics.resolutionRate)}%`
                : '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics?.reopenRate}% reopen rate
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="response">Response Times</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
              <CardDescription>
                Active tickets and workload distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Active Tickets</div>
                    <div className="text-2xl font-bold">{metrics?.activeTickets ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Backlog</div>
                    <div className="text-2xl font-bold">{metrics?.backlogTickets ?? '-'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Agent Utilization</div>
                  <div className="h-2 bg-secondary rounded-full">
                    <div 
                      className="h-2 bg-primary rounded-full" 
                      style={{ width: `${metrics?.agentUtilization ?? 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {metrics?.agentUtilization ?? 0}% of capacity
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
              <CardDescription>
                Breakdown of ticket response times across different time ranges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Under 1 hour</span>
                    <span className="font-medium">
                      {metrics?.responseTimeDistribution.under1Hour.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full">
                    <div 
                      className="h-2 bg-green-500 rounded-full" 
                      style={{ width: `${metrics?.responseTimeDistribution.under1Hour ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>1-4 hours</span>
                    <span className="font-medium">
                      {((metrics?.responseTimeDistribution.under4Hours ?? 0) - 
                        (metrics?.responseTimeDistribution.under1Hour ?? 0)).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full">
                    <div 
                      className="h-2 bg-yellow-500 rounded-full" 
                      style={{ 
                        width: `${(metrics?.responseTimeDistribution.under4Hours ?? 0) - 
                          (metrics?.responseTimeDistribution.under1Hour ?? 0)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>4-24 hours</span>
                    <span className="font-medium">
                      {((metrics?.responseTimeDistribution.under24Hours ?? 0) - 
                        (metrics?.responseTimeDistribution.under4Hours ?? 0)).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full">
                    <div 
                      className="h-2 bg-orange-500 rounded-full" 
                      style={{ 
                        width: `${(metrics?.responseTimeDistribution.under24Hours ?? 0) - 
                          (metrics?.responseTimeDistribution.under4Hours ?? 0)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Over 24 hours</span>
                    <span className="font-medium">
                      {metrics?.responseTimeDistribution.over24Hours.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full">
                    <div 
                      className="h-2 bg-red-500 rounded-full" 
                      style={{ width: `${metrics?.responseTimeDistribution.over24Hours ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resolution Metrics</CardTitle>
                <CardDescription>
                  Ticket resolution and reopen rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Resolution Rate</span>
                      <Badge variant="outline">
                        {metrics?.resolutionRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="h-2 bg-secondary rounded-full">
                      <div 
                        className="h-2 bg-primary rounded-full" 
                        style={{ width: `${metrics?.resolutionRate ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Reopen Rate</span>
                      <Badge variant="outline" className="bg-red-50">
                        {metrics?.reopenRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="h-2 bg-secondary rounded-full">
                      <div 
                        className="h-2 bg-red-500 rounded-full" 
                        style={{ width: `${metrics?.reopenRate ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction</CardTitle>
                <CardDescription>
                  Average satisfaction rating and distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      {metrics?.customerSatisfaction.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      out of 5.0
                    </div>
                    <div className="flex items-center justify-center mt-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-6 w-6 ${
                            star <= (metrics?.customerSatisfaction ?? 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Metrics</CardTitle>
              <CardDescription>
                Team capacity and workload distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Agent Availability</span>
                    <Badge variant="outline">
                      {metrics?.agentAvailability.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="h-2 bg-secondary rounded-full">
                    <div 
                      className="h-2 bg-green-500 rounded-full" 
                      style={{ width: `${metrics?.agentAvailability ?? 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Percentage of agents available for new tickets
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Workload Distribution</span>
                    <Badge variant="outline">
                      {metrics?.agentUtilization.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="h-2 bg-secondary rounded-full">
                    <div 
                      className={`h-2 rounded-full ${
                        (metrics?.agentUtilization ?? 0) > 80 
                          ? 'bg-red-500' 
                          : (metrics?.agentUtilization ?? 0) > 60 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${metrics?.agentUtilization ?? 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Current team utilization vs maximum capacity
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Tickets Per Agent</span>
                    <span className="text-2xl font-bold">
                      {metrics?.ticketsPerAgent.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Average number of tickets handled per agent in this period
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 