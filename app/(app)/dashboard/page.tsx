import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  // Fetch agent's tickets and performance data
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('assigned_agent_id', (await supabase.auth.getUser()).data.user?.id)
    .order('created_at', { ascending: false })

  // Calculate metrics
  const totalTickets = tickets?.length || 0
  const resolvedTickets = tickets?.filter(t => t.status === 'resolved').length || 0
  const avgResponseTime = tickets?.reduce((acc, t) => {
    const firstResponse = t.responses?.[0]
    if (!firstResponse) return acc
    return acc + (new Date(firstResponse.created_at).getTime() - new Date(t.created_at).getTime())
  }, 0) / totalTickets || 0

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Agent Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              Assigned to you
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((resolvedTickets / totalTickets) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {resolvedTickets} resolved of {totalTickets} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(avgResponseTime / (1000 * 60 * 60)).toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Time to first response
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent">
        <TabsList>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="templates">My Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tickets?.slice(0, 5).map(ticket => (
                  <div key={ticket.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{ticket.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Created {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge>{ticket.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add performance charts/graphs here */}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Response Templates</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add template management here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 