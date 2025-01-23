import { NextResponse } from 'next/server'
import type { TicketResponse } from '@/types/database'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the response data from the request
    let content, is_internal, type
    try {
      const body = await request.json()
      content = body.content
      is_internal = body.is_internal ?? false
      type = body.type ?? 'human'
    } catch (e) {
      console.error('Error parsing request body:', e)
      return NextResponse.json(
        { error: 'Invalid request body - expected JSON' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Validate the ticket exists and user has access
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Create the response
    const { data: response, error: responseError } = await supabase
      .from('ticket_responses')
      .insert({
        ticket_id: id,
        author_id: user.id,
        content,
        type,
        is_internal,
      })
      .select()
      .single()

    if (responseError) {
      console.error('Error creating response:', responseError)
      return NextResponse.json(
        { error: 'Failed to create response: ' + responseError.message },
        { status: 500 }
      )
    }

    // Create history entry
    const { error: historyError } = await supabase.from('ticket_history').insert({
      ticket_id: id,
      actor_id: user.id,
      action: 'add_response',
      changes: { content, is_internal, type },
    })

    if (historyError) {
      console.error('Error creating history entry:', historyError)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/tickets/[id]/responses:', error)
    return NextResponse.json(
      { error: 'Internal Server Error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const includeInternal = searchParams.get('internal') === 'true'

    // Get responses
    let query = supabase
      .from('ticket_responses')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    if (!includeInternal) {
      query = query.eq('is_internal', false)
    }

    const { data: responses, error } = await query
    if (error) throw error

    // Get user details for response authors
    const authorIds = Array.from(new Set((responses || []).map(r => r.author_id)))
    const { data: authors } = await supabase
      .from('users')
      .select('id, email, raw_user_meta_data')
      .in('id', authorIds)

    // Map authors to responses
    const responsesWithAuthors = (responses || []).map(response => ({
      ...response,
      author: authors?.find(a => a.id === response.author_id) || null
    }))

    return NextResponse.json(responsesWithAuthors)
  } catch (error) {
    console.error('Error fetching responses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}