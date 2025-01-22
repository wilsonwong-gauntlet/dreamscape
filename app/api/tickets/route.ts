import { NextResponse } from 'next/server'
import type { Ticket } from '@/types/database'
import { processTicketWithAI } from '@/lib/ai'
import { createClient } from '@/app/utils/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const { title, description, priority, source, metadata, tags = [], customFields = {} } = json

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // First, ensure user exists in customers table
    const { data: customer } = await supabase
      .from('customers')
      .select()
      .eq('id', user.id)
      .single()

    if (!customer) {
      // Create customer record if doesn't exist
      await supabase.from('customers').insert({
        id: user.id,
        metadata: {}
      })
    }

    // Create the ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        customer_id: user.id,
        title,
        description,
        priority: priority || 'medium',
        source,
        metadata,
        tags,
        custom_fields: customFields,
        status: 'new'
      })
      .select()
      .single()

    if (error) throw error

    // Process ticket with AI
    const aiResult = await processTicketWithAI(ticket)
    
    if (aiResult.canAutoResolve) {
      // AI can handle this ticket
      await supabase.from('ticket_responses').insert({
        ticket_id: ticket.id,
        content: aiResult.response,
        type: 'ai',
        author_id: null, // System response
        metadata: { confidence: aiResult.confidence }
      })

      // Update ticket status if AI resolved it
      await supabase
        .from('tickets')
        .update({ status: 'resolved' })
        .eq('id', ticket.id)

    } else {
      // Route to appropriate team/agent
      await supabase
        .from('tickets')
        .update({
          team_id: aiResult.suggestedTeamId,
          status: 'open'
        })
        .eq('id', ticket.id)
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Base query
    let query = supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        assigned_agent:agents(*),
        team:teams(*),
        responses:ticket_responses(*)
      `)
      
    // Add filters
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)

    // Add pagination
    query = query.range(offset, offset + limit - 1)
    
    // Get results
    const { data: tickets, error } = await query

    if (error) throw error

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 