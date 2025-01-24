import { NextResponse } from 'next/server'
import type { Ticket } from '@/types/database'
import { createClient } from '@/app/utils/server'
import { cookies } from 'next/headers'

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

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        assigned_agent:agents(*),
        team:teams(*),
        responses:ticket_responses(*)
      `)
      .eq('id', id)
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
  { params }: { params: Promise<{ slug: string }> }
) {
  const id = (await params).slug
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
      .eq('id', id)
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
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log the changes in ticket_history
    await supabase.from('ticket_history').insert({
      ticket_id: id,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate the status is one of the allowed values
    if (body.status && !['new', 'open', 'pending', 'resolved', 'closed'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Record the status change in ticket_history if status was updated
    if (body.status) {
      const { error: historyError } = await supabase
        .from('ticket_history')
        .insert({
          ticket_id: id,
          action: 'status_update',
          changes: { status: { from: ticket.status, to: body.status } }
        })

      if (historyError) throw historyError
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
} 