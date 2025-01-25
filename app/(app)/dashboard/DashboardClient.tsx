'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { MessageCircle, Loader2 } from 'lucide-react'

interface DashboardClientProps {
  agent: { role: string } | null
  customer: any | null
}

interface AnalyticsMetrics {
  totalTickets: number
  resolvedTickets: number
  averageResolutionTime: number
  customerSatisfaction: number
  activeTeams: number
  totalAgents: number
  aiAssistRate: number
  aiSuccessRate: number
  aiAvgConfidence: number
  aiAvgInteractions: number
  aiMetrics: {
    assistRate: number
    successRate: number
    avgConfidence: number
    avgInteractions: number
    totalSuggested: number
    totalUsed: number
  }
}

export function DashboardClient({ agent, customer }: DashboardClientProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        console.log('Fetching metrics...')
        const response = await fetch('/api/analytics/metrics?period=daily')
        console.log('Response status:', response.status)
        if (!response.ok) throw new Error('Failed to fetch metrics')
        const data = await response.json()
        console.log('Metrics data:', data)
        setMetrics(data)
      } catch (error) {
        console.error('Error fetching metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  let roleSpecificContent
  if (agent) {
    if (agent.role === 'admin') {
      roleSpecificContent = (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Quick Stats */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Total Open Tickets</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics ? (metrics.totalTickets - metrics.resolvedTickets) : '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Across all teams</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Avg Resolution Time</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics?.averageResolutionTime ? `${Math.round(metrics.averageResolutionTime)}m` : '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Last 24 hours</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Active Agents</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics?.totalAgents || '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Currently online</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Customer Satisfaction</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics?.customerSatisfaction ? 
                    `${(metrics.customerSatisfaction / 20).toFixed(1)}/5.0` : 
                    '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">30-day average</p>
            </div>
          </div>
        </div>
      )
    } else {
      roleSpecificContent = (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Agent Dashboard</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/tickets/new'}>
                Create Ticket
              </Button>
              <Button size="sm">
                Start Chat
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">My Open Tickets</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics ? (metrics.totalTickets - metrics.resolvedTickets) : '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {metrics ? `${Math.round((metrics.totalTickets - metrics.resolvedTickets) * 0.2)} need response` : '--'}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Avg Resolution Time</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics?.averageResolutionTime ? `${Math.round(metrics.averageResolutionTime)}m` : '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Today's average</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Resolution Rate</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics?.resolvedTickets && metrics?.totalTickets
                    ? `${Math.round((metrics.resolvedTickets / metrics.totalTickets) * 100)}%`
                    : '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Last 7 days</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">CSAT Score</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics?.customerSatisfaction ? 
                    `${(metrics.customerSatisfaction / 20).toFixed(1)}/5.0` : 
                    '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Last 30 days</p>
            </div>
          </div>

          {/* Activity Feed and Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-lg border bg-card">
              <div className="p-6 border-b">
                <h2 className="font-semibold">Recent Activity</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="p-6 border-b">
                <h2 className="font-semibold">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/tickets'}>
                    View My Queue
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Knowledge Base
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Response Templates
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Team Schedule
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  } else if (customer) {
    roleSpecificContent = (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customer Dashboard</h1>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Customer-specific stats and actions */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold">My Tickets</h2>
            {/* Add ticket stats */}
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold">Help Center</h2>
            {/* Add help center links */}
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold">Quick Actions</h2>
            {/* Add quick actions */}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      {/* Main dashboard content */}
      <div className="grid gap-6">
        {roleSpecificContent}
      </div>

      {/* Only show chat widget for customers */}
      {customer && (
        <>
          <ChatWindow isOpen={isChatOpen} />
          <Button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="fixed bottom-4 right-4 rounded-full p-3 h-12 w-12"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </>
      )}
    </div>
  )
} 