import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import type { Team, UpdateTeamInput } from '@/types/team'
import { Database } from '@/types/database'

type TeamRow = Database['public']['Tables']['teams']['Row']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const teamId = (await params).teamId
  const supabase = await createClient()

  try {
    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (error) throw error
    if (!team) return new NextResponse('Team not found', { status: 404 })

    // Transform the response to match our type
    const transformedTeam: Team = {
      id: team.id,
      name: team.name,
      description: team.description,
      timeZone: team.time_zone,
      focusAreas: team.focus_areas,
      maxCapacity: team.max_capacity,
      operatingHours: team.operating_hours,
      isBackup: team.is_backup,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      metrics: {},
      aiSuggestions: {
        lastAnalyzed: undefined
      }
    }

    return NextResponse.json(transformedTeam)
  } catch (error) {
    console.error('Error fetching team:', error)
    return new NextResponse('Error fetching team', { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const teamId = (await params).teamId
  const supabase = await createClient()
  const input: UpdateTeamInput = await request.json()

  try {
    const { data: team, error } = await supabase
      .from('teams')
      .update({
        name: input.name,
        description: input.description,
        time_zone: input.timeZone,
        focus_areas: input.focusAreas,
        max_capacity: input.maxCapacity,
        operating_hours: input.operatingHours,
        is_backup: input.isBackup
      })
      .eq('id', teamId)
      .select()
      .single()

    if (error) throw error
    if (!team) return new NextResponse('Team not found', { status: 404 })

    // Transform the response to match our type
    const transformedTeam: Team = {
      id: team.id,
      name: team.name,
      description: team.description,
      timeZone: team.time_zone,
      focusAreas: team.focus_areas,
      maxCapacity: team.max_capacity,
      operatingHours: team.operating_hours,
      isBackup: team.is_backup,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      metrics: {},
      aiSuggestions: {
        lastAnalyzed: undefined
      }
    }

    return NextResponse.json(transformedTeam)
  } catch (error) {
    console.error('Error updating team:', error)
    return new NextResponse('Error updating team', { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const teamId = (await params).teamId
  const supabase = await createClient()

  try {
    // First check if team has any active tickets
    const { data: activeTickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id')
      .eq('team_id', teamId)
      .eq('status', 'open')
      .limit(1)

    if (ticketsError) throw ticketsError
    
    if (activeTickets && activeTickets.length > 0) {
      return new NextResponse(
        'Cannot delete team with active tickets. Please reassign or close all tickets first.',
        { status: 400 }
      )
    }

    // Then check if team has any agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id')
      .eq('team_id', teamId)
      .limit(1)

    if (agentsError) throw agentsError

    if (agents && agents.length > 0) {
      return new NextResponse(
        'Cannot delete team with assigned agents. Please remove all agents first.',
        { status: 400 }
      )
    }

    // If no active tickets or agents, proceed with deletion
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (deleteError) throw deleteError

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting team:', error)
    return new NextResponse('Error deleting team', { status: 500 })
  }
} 