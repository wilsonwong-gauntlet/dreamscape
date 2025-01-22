import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { InviteList } from './InviteList'

export default async function InvitesPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Verify admin status
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!agent || agent.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get teams for dropdown
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')

  // Get existing invites
  const { data: invites } = await supabase
    .from('invites')
    .select(`
      id,
      email,
      role,
      team_id,
      token,
      teams (
        name
      ),
      created_at,
      expires_at,
      used_at
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Manage Team Invites</h1>
      <InviteList teams={teams || []} invites={invites || []} />
    </div>
  )
} 