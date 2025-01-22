import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get user role
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: customer } = await supabase
    .from('customers')
    .select()
    .eq('id', user.id)
    .single()

  let roleSpecificContent
  if (agent) {
    if (agent.role === 'admin') {
      roleSpecificContent = (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Admin-specific stats and actions */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold">Total Tickets</h2>
              {/* Add ticket stats */}
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold">Agent Performance</h2>
              {/* Add agent stats */}
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold">System Status</h2>
              {/* Add system stats */}
            </div>
          </div>
        </div>
      )
    } else {
      roleSpecificContent = (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agent Dashboard</h1>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Agent-specific stats and actions */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold">My Queue</h2>
              {/* Add queue stats */}
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold">My Performance</h2>
              {/* Add performance stats */}
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold">Team Status</h2>
              {/* Add team stats */}
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
  } else {
    redirect('/auth/login')
  }

  return (
    <div className="p-6">
      {roleSpecificContent}
    </div>
  )
} 