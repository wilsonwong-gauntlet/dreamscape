import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
    const id = (await params).slug
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get macro
    const { data: macro, error: macroError } = await supabase
      .from('macros')
      .select(`
        *,
        team:teams(id, name)
      `)
      .eq('id', id)
      .single()

    if (macroError) {
      console.error('Error fetching macro:', macroError)
      return NextResponse.json(
        { error: 'Failed to fetch macro' },
        { status: 500 }
      )
    }

    return NextResponse.json(macro)
  } catch (error) {
    console.error('Error in GET /api/macros/[id]:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
    const id = (await params).slug
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First check if user is an agent
    const { data: agent } = await supabase
      .from('agents')
      .select()
      .eq('id', user.id)
      .single()

    if (!agent) {
      return NextResponse.json(
        { error: 'Only agents can update macros' },
        { status: 403 }
      )
    }

    // Get request body
    const { title, content, description, category, variables, team_id } = await request.json()

    // Validate input
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Update macro
    const { data: macro, error: macroError } = await supabase
      .from('macros')
      .update({
        title,
        content,
        description,
        category,
        variables,
        team_id
      })
      .eq('id', id)
      .select()
      .single()

    if (macroError) {
      console.error('Error updating macro:', macroError)
      return NextResponse.json(
        { error: 'Failed to update macro' },
        { status: 500 }
      )
    }

    return NextResponse.json(macro)
  } catch (error) {
    console.error('Error in PATCH /api/macros/[id]:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
    const id = (await params).slug
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First check if user is an agent
    const { data: agent } = await supabase
      .from('agents')
      .select()
      .eq('id', user.id)
      .single()

    if (!agent) {
      return NextResponse.json(
        { error: 'Only agents can delete macros' },
        { status: 403 }
      )
    }

    // Delete macro
    const { error: macroError } = await supabase
      .from('macros')
      .delete()
      .eq('id', id)

    if (macroError) {
      console.error('Error deleting macro:', macroError)
      return NextResponse.json(
        { error: 'Failed to delete macro' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/macros/[id]:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 