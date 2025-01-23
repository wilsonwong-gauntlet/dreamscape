import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  try {
    console.log('Starting GET /api/macros')
    const supabase = await createClient()
    console.log('Supabase client created')

    // Get current user
    let user
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      user = authUser
      console.log('Auth check result:', user ? 'User found' : 'No user')
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } catch (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Auth error', details: authError instanceof Error ? authError.message : 'Unknown auth error' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const teamId = searchParams.get('team_id')
    console.log('Query params:', { category, teamId })

    // Build query
    let query = supabase
      .from('macros')
      .select(`
        *,
        team:teams(id, name)
      `)

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    console.log('Executing query...')
    // Execute query
    const { data: macros, error: macrosError } = await query

    if (macrosError) {
      console.error('Database error:', macrosError)
      console.error('Error details:', {
        message: macrosError.message,
        details: macrosError.details,
        hint: macrosError.hint,
        code: macrosError.code
      })
      return NextResponse.json(
        { error: 'Failed to fetch macros', details: macrosError.message },
        { status: 500 }
      )
    }

    console.log('Query successful, found', macros?.length ?? 0, 'macros')
    return NextResponse.json(macros)
  } catch (error) {
    console.error('Error in GET /api/macros:', error)
    console.error('Full error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log('Starting POST /api/macros')
    const supabase = await createClient()
    console.log('Supabase client created')

    // Get current user
    let user
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      user = authUser
      console.log('Auth check result:', user ? 'User found' : 'No user')
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } catch (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Auth error', details: authError instanceof Error ? authError.message : 'Unknown auth error' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    console.log('Request body:', body)
    const { title, content, description, category, variables, team_id } = body

    // Validate input
    if (!title || !content) {
      console.log('Validation failed: missing title or content')
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // First check if user is an agent
    const { data: agent } = await supabase
      .from('agents')
      .select()
      .eq('id', user.id)
      .single()

    if (!agent) {
      return NextResponse.json(
        { error: 'Only agents can create macros' },
        { status: 403 }
      )
    }

    console.log('Creating macro...')
    // Create macro
    const { data: macro, error: macroError } = await supabase
      .from('macros')
      .insert({
        title,
        content,
        description,
        category,
        variables,
        team_id,
        created_by: user.id
      })
      .select()
      .single()

    if (macroError) {
      console.error('Database error:', macroError)
      console.error('Error details:', {
        message: macroError.message,
        details: macroError.details,
        hint: macroError.hint,
        code: macroError.code
      })
      return NextResponse.json(
        { error: 'Failed to create macro', details: macroError.message },
        { status: 500 }
      )
    }

    console.log('Macro created successfully')
    return NextResponse.json(macro)
  } catch (error) {
    console.error('Error in POST /api/macros:', error)
    console.error('Full error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 