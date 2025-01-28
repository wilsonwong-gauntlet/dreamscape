import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OverviewMetricsCard } from "@/components/analytics/OverviewMetricsCard"
import { AIMetricsCard } from "@/components/analytics/AIMetricsCard"
import { TeamPerformanceCard } from "@/components/analytics/TeamPerformanceCard"
import Link from 'next/link'
import {
  BarChart3,
  Settings,
  TrendingUp,
  Users,
  DollarSign,
  Briefcase,
  Bell,
} from 'lucide-react'

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Fund performance and business overview',
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated and is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!agent || agent.role !== 'admin') {
    redirect('/')
  }

  // Fetch recent activity
  const { data: recentActivity } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Fund Overview</h1>
          <p className="text-muted-foreground mt-1">Performance metrics and business insights</p>
        </div>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/admin/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Fund Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4B</div>
            <p className="text-xs text-muted-foreground">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">YTD Returns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18.7%</div>
            <p className="text-xs text-muted-foreground">vs 14.2% benchmark</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">+3 this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Analytics</CardTitle>
            <CardDescription>Key performance indicators and risk metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Sharpe Ratio</div>
                  <div className="text-2xl font-bold">2.1</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Beta</div>
                  <div className="text-2xl font-bold">0.85</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Alpha</div>
                  <div className="text-2xl font-bold">4.2%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Max Drawdown</div>
                  <div className="text-2xl font-bold">-8.3%</div>
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
                  <div className="text-2xl font-bold">45%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Fixed Income</div>
                  <div className="text-2xl font-bold">30%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Alternatives</div>
                  <div className="text-2xl font-bold">15%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Cash</div>
                  <div className="text-2xl font-bold">10%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Activity</CardTitle>
            <CardDescription>Recent client interactions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity?.length ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4">
                    <div className="text-sm">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Overview</CardTitle>
            <CardDescription>Client support and satisfaction metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Open Tickets</div>
                  <div className="text-2xl font-bold">12</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Avg Response Time</div>
                  <div className="text-2xl font-bold">2.4h</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">CSAT Score</div>
                  <div className="text-2xl font-bold">4.8</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Resolution Rate</div>
                  <div className="text-2xl font-bold">94%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
