import { NextResponse } from 'next/server'
import type { Ticket, Database } from '@/types/database'
import { createClient } from '@/utils/supabase/server'

type RoutingResult = Database['public']['Functions']['evaluate_routing_rules']['Returns'][0]

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

    // Process ticket with Edge Function
    const { data: processResult, error: processError } = await supabase.functions.invoke(
      'ticket-agent',
      {
        body: { ticketId: ticket.id }
      }
    )

    if (processError) {
      console.error('Error processing ticket:', processError)
      // Continue without processing if there's an error
      return NextResponse.json(ticket)
    }

    // Return the ticket with processing results
    return NextResponse.json({
      ...ticket,
      processing_result: processResult
    })

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

    // Base query with last response
    let query = supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(id, user:auth.users(email)),
        assigned_agent:agents(id, user:auth.users(email)),
        team:teams(id, name),
        last_response:ticket_responses(
          author_id,
          created_at,
          is_internal,
          type
        )
      `)
      .order('created_at', { foreignTable: 'ticket_responses', ascending: false })
      .limit(1, { foreignTable: 'ticket_responses' })
      
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