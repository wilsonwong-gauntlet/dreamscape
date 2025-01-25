import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { InviteList } from './InviteList'

// Define the types to match InviteList's expectations
interface Team {
  id: string
  name: string
}

interface Invite {
  id: string
  email: string
  role: 'agent' | 'admin'
  team_id: string
  teams: Team[]
  created_at: string
  expires_at: string
  used_at: string | null
  token: string
}

interface RawInvite {
  id: string
  email: string
  role: 'agent' | 'admin'
  team_id: string
  teams: Team | null
  created_at: string
  expires_at: string
  used_at: string | null
  token: string
}

export default async function InvitesPage() {
  const supabase = await createClient()
  
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
  const { data: rawInvites } = await supabase
    .from('invites')
    .select(`
      id,
      email,
      role,
      team_id,
      token,
      teams:team_id (
        id,
        name
      ),
      created_at,
      expires_at,
      used_at
    `)
    .order('created_at', { ascending: false })

  // Transform the data to match the expected format
  const invites = (rawInvites as RawInvite[] | null)?.map(invite => ({
    ...invite,
    teams: invite.teams ? [invite.teams] : []
  })) as Invite[] | undefined

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Manage Team Invites</h1>
      <InviteList teams={teams || []} invites={invites || []} />
    </div>
  )
} 