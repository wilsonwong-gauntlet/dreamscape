import { NextResponse } from 'next/server'
import type { TicketResponse } from '@/types/database'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { adminAuthClient } from '@/utils/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const id = (await params).slug
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get ticket data including customer_id
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(
          id,
          user_id
        )
      `)
      .eq('id', id)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket:', ticketError)
      return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 })
    }

    // Get customer user data using admin auth client
    if (ticket.customer?.user_id) {
      const { data: customerUser, error: customerError } = await adminAuthClient.getUserById(ticket.customer.user_id)
      if (customerError) {
        console.error('Error fetching customer:', customerError)
      } else {
        ticket.customer.user = customerUser
      }
    }

    // Get the response data from the request
    const { content, type = 'human', is_internal = false } = await request.json()

    // Validate required fields
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Validate the ticket exists and user has access
    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Create the response
    const { data: response, error: responseError } = await supabase
      .from('ticket_responses')
      .insert({
        ticket_id: id,
        content,
        type,
        is_internal,
        author_id: user.id,
      })
      .select(`
        *,
        author:auth.users(
          id,
          email,
          user_metadata
        )
      `)
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
  { params }: { params: Promise<{ slug: string }> }
) {
  const id = (await params).slug
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