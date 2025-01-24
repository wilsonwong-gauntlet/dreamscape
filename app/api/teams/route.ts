import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { Team, CreateTeamInput, UpdateTeamInput, OperatingHours } from '@/types/team'
import { Database } from '@/types/database'

type TeamRow = Database['public']['Tables']['teams']['Row']
type AgentRow = Database['public']['Tables']['agents']['Row'] & {
  user: {
    email: string
    user_metadata: {
      name?: string
    }
  }
}

export async function GET() {
  const supabase = await createClient()

  try {
    // First get teams without agents to verify the base query works
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    if (error) throw error

    // Transform the data to match our type
    const transformedTeams = teams.map(team => ({
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
      // We'll add metrics and AI suggestions here later
      metrics: {},
      aiSuggestions: {
        lastAnalyzed: undefined
      }
    }))

    return NextResponse.json(transformedTeams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Error fetching teams' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const input: CreateTeamInput = await request.json()

  try {
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: input.name,
        description: input.description,
        time_zone: input.timeZone,
        focus_areas: input.focusAreas,
        max_capacity: input.maxCapacity,
        operating_hours: input.operatingHours,
        is_backup: input.isBackup
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('No data returned from insert')

    const team = data as TeamRow

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
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Error creating team' }, { status: 500 })
  }
}

// Helper function to transform database fields to our type
function transformDatabaseFields(dbTeam: TeamRow): Team {
  return {
    id: dbTeam.id,
    name: dbTeam.name,
    description: dbTeam.description,
    timeZone: dbTeam.time_zone,
    focusAreas: dbTeam.focus_areas,
    maxCapacity: dbTeam.max_capacity,
    operatingHours: dbTeam.operating_hours,
    isBackup: dbTeam.is_backup,
    createdAt: dbTeam.created_at,
    updatedAt: dbTeam.updated_at,
    metrics: {},
    aiSuggestions: {
      lastAnalyzed: undefined
    }
  }
} 