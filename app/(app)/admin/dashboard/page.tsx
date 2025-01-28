import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import {
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  Bell,
  ShieldAlert,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

export const metadata = {
  title: 'Wealth Management Dashboard',
  description: 'Client portfolio and business overview',
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated and is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
          <h1 className="text-2xl font-bold">Wealth Management Overview</h1>
          <p className="text-muted-foreground mt-1">Portfolio performance and client insights</p>
        </div>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/admin/clients">
              <UserPlus className="h-4 w-4 mr-2" />
              New Client
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4B</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+12.5%</span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+3</span>
              <span className="ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Avg Client Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15.2%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+2.3%</span>
              <span className="ml-1">vs benchmark</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Client Satisfaction</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">Based on recent surveys</p>
          </CardContent>
        </Card>
      </div>

      {/* Client Analytics & Risk Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Analytics</CardTitle>
            <CardDescription>Portfolio distribution and demographics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Avg Portfolio Size</div>
                  <div className="text-2xl font-bold">$1.9M</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">New Clients MTD</div>
                  <div className="text-2xl font-bold">7</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Client Retention</div>
                  <div className="text-2xl font-bold">98%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Avg Relationship</div>
                  <div className="text-2xl font-bold">8.5y</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Management</CardTitle>
            <CardDescription>Portfolio risk metrics and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShieldAlert className="h-8 w-8 text-yellow-500 mr-4" />
                  <div>
                    <p className="font-medium">High Concentration Alert</p>
                    <p className="text-sm text-muted-foreground">5 portfolios exceed sector limits</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShieldAlert className="h-8 w-8 text-red-500 mr-4" />
                  <div>
                    <p className="font-medium">Rebalancing Required</p>
                    <p className="text-sm text-muted-foreground">12 portfolios need attention</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest client interactions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity?.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4">
                  <div className="text-sm">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Overview</CardTitle>
            <CardDescription>Regulatory requirements and reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Pending Reviews</div>
                  <div className="text-2xl font-bold">8</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">KYC Updates</div>
                  <div className="text-2xl font-bold">15</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Risk Assessments</div>
                  <div className="text-2xl font-bold">95%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Policy Adherence</div>
                  <div className="text-2xl font-bold">100%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
