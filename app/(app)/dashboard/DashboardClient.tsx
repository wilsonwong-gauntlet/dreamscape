'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { MessageCircle, Loader2 } from 'lucide-react'

interface AnalyticsMetrics {
  totalAUM: number
  portfolioReturn: number
  ytdPerformance: number
  cashBalance: number
}

interface DashboardClientProps {
  agent: { role: string } | null
  customer: any
}

export function DashboardClient({ agent, customer }: DashboardClientProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        console.log('Fetching metrics...')
        const response = await fetch('/api/analytics/portfolio')
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
          <h1 className="text-2xl font-semibold tracking-tight">Fund Overview</h1>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Total AUM</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics ? `$${(metrics.totalAUM / 1000000).toFixed(1)}M` : '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Across all accounts</p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">YTD Performance</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics ? `${metrics.ytdPerformance.toFixed(2)}%` : '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Year to date</p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Active Clients</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  '127'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Last 30 days</p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">New Investments</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  '$24.5M'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">This month</p>
            </div>
          </div>
        </div>
      )
    } else {
      roleSpecificContent = (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Client Overview</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/clients'}>
                View All Clients
              </Button>
              <Button size="sm" onClick={() => window.location.href = '/calendar'}>
                Schedule Meeting
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Managed AUM</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  metrics ? `$${(metrics.totalAUM / 1000000).toFixed(1)}M` : '--'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Total client assets</p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Active Clients</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  '42'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Under management</p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Pending Tasks</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  '8'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Requires attention</p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Upcoming Meetings</h2>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  '3'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Next 7 days</p>
            </div>
          </div>

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
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/clients'}>
                    View Clients
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/research'}>
                    Research Library
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/calendar'}>
                    Schedule Meeting
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/tasks'}>
                    View Tasks
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
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio Overview</h1>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Portfolio Value</h2>
            <p className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                metrics ? `$${(metrics.totalAUM).toLocaleString()}` : '--'
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total assets</p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Total Return</h2>
            <p className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                metrics ? `${metrics.portfolioReturn.toFixed(2)}%` : '--'
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Since inception</p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">YTD Performance</h2>
            <p className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                metrics ? `${metrics.ytdPerformance.toFixed(2)}%` : '--'
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Year to date</p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Cash Balance</h2>
            <p className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                metrics ? `$${metrics.cashBalance.toLocaleString()}` : '--'
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Available funds</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-lg border bg-card">
            <div className="p-6 border-b">
              <h2 className="font-semibold">Recent Documents</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/documents'}>
                  View All Documents
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="p-6 border-b">
              <h2 className="font-semibold">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/research'}>
                  Research Library
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/documents'}>
                  View Documents
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/support'}>
                  Get Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="grid gap-6">
        {roleSpecificContent}
      </div>

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