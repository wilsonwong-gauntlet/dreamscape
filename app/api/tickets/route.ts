import { NextResponse } from 'next/server'
import type { Ticket, Database } from '@/types/database'
import { processTicketWithAI } from '@/lib/ai'
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
      // Prepare ticket data for routing rules
      const ticketData = {
        title,
        description,
        priority: priority || 'medium',
        source,
        tags,
        ...metadata,
        ...customFields
      }

      // Evaluate routing rules
      const { data: routingResult, error: routingError } = await supabase
        .rpc('evaluate_routing_rules', {
          ticket_data: ticketData
        })
        .maybeSingle<RoutingResult>()

      if (routingError) {
        console.error('Routing error:', routingError)
        // Continue without routing if there's an error
      } else if (routingResult) {
        // Apply the routing rule
        const updates: Record<string, string> = {}
        
        if (routingResult.action === 'assign_team') {
          updates.team_id = routingResult.action_target
        } else if (routingResult.action === 'assign_agent') {
          updates.assigned_agent_id = routingResult.action_target
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('tickets')
            .update({ ...updates, status: 'open' })
            .eq('id', ticket.id)

          if (updateError) {
            console.error('Error applying routing:', updateError)
          }

          // Add to ticket history
          await supabase
            .from('ticket_history')
            .insert({
              ticket_id: ticket.id,
              action: 'route',
              actor_id: null, // System action
              changes: {
                rule_id: routingResult.rule_id,
                ...updates
              }
            })
        }
      }
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