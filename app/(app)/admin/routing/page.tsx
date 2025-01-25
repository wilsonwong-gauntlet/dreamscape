import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { RoutingRuleList } from './RoutingRuleList'

export const dynamic = 'force-dynamic'

export default async function RoutingRulesPage() {
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

  // Fetch routing rules
  const { data: rules } = await supabase
    .from('routing_rules')
    .select('*')
    .order('priority', { ascending: true })

  // Fetch teams for assignment
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')

  // Fetch agents for assignment
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, email, team_id')

  return (
    <div className="py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Routing Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure automatic ticket routing based on conditions
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <h2 className="text-sm font-medium">How routing works:</h2>
          <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-muted-foreground">
            <li>Rules are evaluated in priority order (lower number = higher priority)</li>
            <li>The first matching rule will be applied</li>
            <li>Rules can assign tickets to teams or specific agents</li>
            <li>If no rules match, the ticket will remain unassigned</li>
          </ul>
        </div>

        <RoutingRuleList 
          rules={rules || []}
          teams={teams || []}
          agents={agents || []}
        />
      </div>
    </div>
  )
} 