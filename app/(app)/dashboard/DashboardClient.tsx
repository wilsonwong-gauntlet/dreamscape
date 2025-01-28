// app/(app)/dashboard/DashboardClient.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Calendar,
  Activity,
  PieChart,
  Clock
} from 'lucide-react'

interface DashboardClientProps {
  agent: { role: string } | null
  customer: any
}

export function DashboardClient({ agent, customer }: DashboardClientProps) {
  const [metrics, setMetrics] = useState<any>(null)
  const [customerDetails, setCustomerDetails] = useState<{ email?: string } | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      const response = await fetch('/api/analytics/portfolio')
      const data = await response.json()
      setMetrics(data)
    }
    fetchMetrics()
  }, [])

  useEffect(() => {
    async function fetchCustomerDetails() {
      if (customer?.id) {
        try {
          const response = await fetch(`/api/customers/${customer.id}`)
          if (!response.ok) throw new Error('Failed to fetch customer details')
          const data = await response.json()
          setCustomerDetails(data)
        } catch (error) {
          console.error('Error fetching customer details:', error)
        }
      }
    }
    fetchCustomerDetails()
  }, [customer?.id])

  return (
    <div className="py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Welcome Back{customerDetails?.email ? `, ${customerDetails.email}` : ''}</h1>
          <p className="text-muted-foreground mt-1">Your wealth management overview</p>
        </div>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/portfolio">
              <PieChart className="h-4 w-4 mr-2" />
              View Portfolio
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/support">
              Schedule Review
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Total Portfolio Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.totalAUM || 0)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+2.5%</span>
              <span className="ml-1">since last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">YTD Return</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics?.ytdPerformance || 0}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+3.2%</span>
              <span className="ml-1">vs benchmark</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Cash Balance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.cashBalance || 0)}</div>
            <p className="text-xs text-muted-foreground">Available for investment</p>
          </CardContent>
        </Card>
      </div>

      {/* Investment Goals & Asset Allocation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Investment Goals</CardTitle>
            <CardDescription>Progress towards your financial objectives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Retirement Fund</span>
                  <span className="font-medium">75% of goal</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-2 bg-primary rounded-full" style={{ width: '75%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Education Fund</span>
                  <span className="font-medium">60% of goal</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-2 bg-primary rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Current portfolio composition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Equities</div>
                  <div className="text-2xl font-bold">{metrics?.assetAllocation?.equities.toFixed(1) || 0}%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Fixed Income</div>
                  <div className="text-2xl font-bold">{metrics?.assetAllocation?.fixedIncome.toFixed(1) || 0}%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Alternatives</div>
                  <div className="text-2xl font-bold">{metrics?.assetAllocation?.alternatives.toFixed(1) || 0}%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Cash</div>
                  <div className="text-2xl font-bold">{metrics?.assetAllocation?.cash.toFixed(1) || 0}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Next Review */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="mr-4">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Dividend Payment</p>
                  <p className="text-xs text-muted-foreground">AAPL - $125.50</p>
                </div>
                <div className="text-sm text-muted-foreground">2h ago</div>
              </div>
              <div className="flex items-center">
                <div className="mr-4">
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Portfolio Rebalancing</p>
                  <p className="text-xs text-muted-foreground">Automatic Adjustment</p>
                </div>
                <div className="text-sm text-muted-foreground">1d ago</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Review</CardTitle>
            <CardDescription>Upcoming meeting with your advisor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-primary mr-4" />
                <div>
                  <p className="font-medium">Quarterly Portfolio Review</p>
                  <p className="text-sm text-muted-foreground">March 15, 2024 - 2:00 PM</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Reschedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}