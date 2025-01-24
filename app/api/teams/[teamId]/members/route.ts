import { adminAuthClient } from '@/utils/supabase/server'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { Database } from '@/types/database'

type Agent = {
  id: string
  role: string
  status: string
  team_id: string
  skills: string[]
  created_at: string
  updated_at: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const teamId = (await params).teamId
  const supabase = await createClient()

  try {
    console.log('Fetching agents for team:', teamId)
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, team_id, role, status, skills, created_at, updated_at')
      .eq('team_id', teamId)

    if (agentsError) {
      console.error('Error fetching agents:', agentsError)
      throw agentsError
    }
    if (!agents) return NextResponse.json([])

    console.log('Found agents:', agents)

    // Then get the user details for each agent
    const transformedMembers = await Promise.all(agents.map(async (agent: Agent) => {
      console.log('Fetching user details for agent:', agent.id)
      const { data } = await adminAuthClient.getUserById(agent.id)
      console.log('User data response:', JSON.stringify(data, null, 2))
      
      const user = data?.user
      const identityData = user?.identities?.[0]?.identity_data
      console.log('Extracted user data:', {
        id: user?.id,
        email: user?.email,
        metadata: user?.user_metadata,
        identityEmail: identityData?.email
      })

      return {
        id: agent.id,
        name: user?.user_metadata?.full_name || identityData?.name || 'Unknown',
        email: user?.email || identityData?.email || '',
        role: agent.role,
        status: agent.status,
        createdAt: agent.created_at,
      }
    }))

    console.log('Transformed members:', transformedMembers)
    return NextResponse.json(transformedMembers)
  } catch (error) {
    console.error('Error fetching team members:', error)
    return new NextResponse('Error fetching team members', { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const teamId = (await params).teamId
  const supabase = await createClient()
  const body = await request.json()

  try {
    console.log('Looking for user with email:', body.email)
    // First get user by email
    const { data } = await adminAuthClient.listUsers()
    console.log('All users:', data?.users.map(u => ({ id: u.id, email: u.email })))
    
    const user = data?.users.find(u => u.email === body.email)
    console.log('Found user:', user ? { id: user.id, email: user.email } : 'not found')

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    // Then check if user is already in the team
    console.log('Checking if user is already in team:', teamId)
    const { data: existingMember, error: memberError } = await supabase
      .from('agents')
      .select('id')
      .eq('team_id', teamId)
      .eq('id', user.id)
      .single()

    if (existingMember) {
      console.log('User already in team:', existingMember)
      return new NextResponse('User is already a member of this team', { status: 400 })
    }

    // Add user to team
    console.log('Adding user to team:', { teamId, userId: user.id, role: body.role })
    const { data: newAgent, error: createError } = await supabase
      .from('agents')
      .insert({
        id: user.id,  // Use the auth user id as the agent id
        team_id: teamId,
        role: body.role || 'agent',
        status: 'active',
        skills: [],
      })
      .select()
      .single()

    if (createError) throw createError
    if (!newAgent) throw new Error('Failed to create member')

    console.log('Created new agent:', newAgent)

    // Transform the response
    const transformedMember = {
      id: newAgent.id,
      name: user.user_metadata?.full_name || 'Unknown',
      email: user.email,
      role: newAgent.role,
      status: newAgent.status,
      createdAt: newAgent.created_at,
    }

    console.log('Returning transformed member:', transformedMember)
    return NextResponse.json(transformedMember)
  } catch (error) {
    console.error('Error adding team member:', error)
    return new NextResponse('Error adding team member', { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const { teamId, memberId } = await params
  const supabase = await createClient()
  const body = await request.json()

  try {
    const { data: member, error } = await supabase
      .from('agents')
      .update({
        role: body.role,
        status: body.status,
      })
      .eq('id', memberId)
      .eq('team_id', teamId) // Extra safety check
      .select()
      .single()

    if (error) throw error
    if (!member) return new NextResponse('Member not found', { status: 404 })

    return NextResponse.json(member)
  } catch (error) {
    console.error('Error updating team member:', error)
    return new NextResponse('Error updating team member', { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const { teamId, memberId } = await params
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', memberId)
      .eq('team_id', teamId) // Extra safety check

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error removing team member:', error)
    return new NextResponse('Error removing team member', { status: 500 })
  }
} 