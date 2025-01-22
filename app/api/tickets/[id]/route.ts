import { NextResponse } from 'next/server'
import type { Ticket } from '@/types/database'
import { createClient } from '@/app/utils/server'
import { cookies } from 'next/headers'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        assigned_agent:agents(*),
        team:teams(*),
        responses:ticket_responses(*)
      `)
      .eq('id', params.id)
      .single()

    if (error) throw error
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const { status, priority, assigned_agent_id, team_id, tags, custom_fields } = json

    // Get current ticket state
    const { data: currentTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Update ticket
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update({
        status: status || currentTicket.status,
        priority: priority || currentTicket.priority,
        assigned_agent_id: assigned_agent_id || currentTicket.assigned_agent_id,
        team_id: team_id || currentTicket.team_id,
        tags: tags || currentTicket.tags,
        custom_fields: {
          ...currentTicket.custom_fields,
          ...custom_fields
        }
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log the changes in ticket_history
    await supabase.from('ticket_history').insert({
      ticket_id: params.id,
      actor_id: user.id,
      action: 'update',
      changes: json
    })

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get the update data from the request
    const updates = await request.json()

    // Validate the ticket exists and user has access
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', params.id)
      .single()

    if (ticketError || !ticket) {
      return new NextResponse('Ticket not found', { status: 404 })
    }

    // Update the ticket
    const { error: updateError } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return new NextResponse('Failed to update ticket', { status: 500 })
    }

    // Create history entry
    await supabase.from('ticket_history').insert({
      ticket_id: params.id,
      actor_id: user.id,
      action: 'update',
      changes: updates,
    })

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Error in PATCH /api/tickets/[id]:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 