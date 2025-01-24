import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    const id = (await params).id
  try {
    const { score } = await request.json()
    
    // Validate score
    if (!score || score < 1 || score > 5) {
      return NextResponse.json(
        { error: 'Invalid satisfaction score. Must be between 1 and 5.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify ticket exists and is resolved
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('status')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    if (ticket.status !== 'resolved') {
      return NextResponse.json(
        { error: 'Can only rate resolved tickets' },
        { status: 400 }
      )
    }

    // Update ticket with satisfaction score
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ satisfaction_score: score })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating satisfaction score:', updateError)
      return NextResponse.json(
        { error: 'Failed to update satisfaction score' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in satisfaction score endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 