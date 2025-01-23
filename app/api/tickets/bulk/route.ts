import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the update data from the request
    const { ticketIds, operation, data } = await request.json()

    // Validate input
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty ticketIds array' },
        { status: 400 }
      )
    }

    if (operation !== 'update') {
      return NextResponse.json(
        { error: 'Invalid operation. Only "update" is supported.' },
        { status: 400 }
      )
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid update data' },
        { status: 400 }
      )
    }

    // Validate status enum if it's being updated
    if (data.status && !['new', 'open', 'pending', 'resolved', 'closed'].includes(data.status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Prepare update data with timestamp
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    }

    // Update all tickets
    const { data: updatedTickets, error: updateError } = await supabase
      .from('tickets')
      .update(updateData)
      .in('id', ticketIds)
      .select()

    if (updateError) {
      console.error('Error updating tickets:', updateError)
      return NextResponse.json(
        { error: 'Failed to update tickets: ' + updateError.message },
        { status: 500 }
      )
    }

    // Create history entries for each ticket
    const historyEntries = ticketIds.map(ticketId => ({
      ticket_id: ticketId,
      actor_id: user.id,
      action: 'update',
      changes: data,
    }))

    const { error: historyError } = await supabase
      .from('ticket_history')
      .insert(historyEntries)

    if (historyError) {
      console.error('Error creating history entries:', historyError)
      // Don't fail the request if history creation fails
    }

    return NextResponse.json({
      message: `Successfully updated ${updatedTickets.length} tickets`,
      tickets: updatedTickets
    })
  } catch (error) {
    console.error('Error in PATCH /api/tickets/bulk:', error)
    return NextResponse.json(
      { error: 'Internal Server Error: ' + (error as Error).message },
      { status: 500 }
    )
  }
} 