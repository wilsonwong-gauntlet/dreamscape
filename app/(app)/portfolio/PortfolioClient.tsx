'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { MessageCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface AnalyticsMetrics {
  totalAUM: number
  portfolioReturn: number
  ytdPerformance: number
  cashBalance: number
  assetAllocation: {
    equities: number
    fixedIncome: number
    alternatives: number
    cash: number
  }
  performance: {
    oneMonth: number
    threeMonths: number
    sixMonths: number
    ytd: number
    oneYear: number
    threeYears: number
    fiveYears: number
  }
}

interface PortfolioClientProps {
  agent: { role: string } | null
  customer: any
}

export function PortfolioClient({ agent, customer }: PortfolioClientProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/analytics/portfolio')
        if (!response.ok) throw new Error('Failed to fetch metrics')
        const data = await response.json()
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
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Portfolio Return</h2>
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
              <h2 className="font-semibold">Performance History</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : metrics ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">1 Month</div>
                      <div className="text-lg font-semibold">{metrics.performance.oneMonth.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">3 Months</div>
                      <div className="text-lg font-semibold">{metrics.performance.threeMonths.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">6 Months</div>
                      <div className="text-lg font-semibold">{metrics.performance.sixMonths.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">1 Year</div>
                      <div className="text-lg font-semibold">{metrics.performance.oneYear.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">3 Years</div>
                      <div className="text-lg font-semibold">{metrics.performance.threeYears.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">5 Years</div>
                      <div className="text-lg font-semibold">{metrics.performance.fiveYears.toFixed(2)}%</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No performance data available</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="p-6 border-b">
              <h2 className="font-semibold">Asset Allocation</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : metrics ? (
                  <>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Equities</span>
                        <span>{metrics.assetAllocation.equities}%</span>
                      </div>
                      <div className="mt-1 h-2 bg-secondary rounded-full">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${metrics.assetAllocation.equities}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Fixed Income</span>
                        <span>{metrics.assetAllocation.fixedIncome}%</span>
                      </div>
                      <div className="mt-1 h-2 bg-secondary rounded-full">
                        <div
                          className="h-2 bg-green-500 rounded-full"
                          style={{ width: `${metrics.assetAllocation.fixedIncome}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Alternatives</span>
                        <span>{metrics.assetAllocation.alternatives}%</span>
                      </div>
                      <div className="mt-1 h-2 bg-secondary rounded-full">
                        <div
                          className="h-2 bg-purple-500 rounded-full"
                          style={{ width: `${metrics.assetAllocation.alternatives}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Cash</span>
                        <span>{metrics.assetAllocation.cash}%</span>
                      </div>
                      <div className="mt-1 h-2 bg-secondary rounded-full">
                        <div
                          className="h-2 bg-yellow-500 rounded-full"
                          style={{ width: `${metrics.assetAllocation.cash}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No allocation data available</p>
                )}
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