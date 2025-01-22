import { NextResponse } from 'next/server'
import type { TicketResponse } from '@/types/database'
import { processTicketWithAI } from '@/lib/ai'
import { createClient } from '@/app/utils/server'
import { cookies } from 'next/headers'

export async function POST(
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

    // Get the response data from the request
    const { content, is_internal, type } = await request.json()

    // Validate the ticket exists and user has access
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', params.id)
      .single()

    if (ticketError || !ticket) {
      return new NextResponse('Ticket not found', { status: 404 })
    }

    // Create the response
    const { error: responseError } = await supabase
      .from('ticket_responses')
      .insert({
        ticket_id: params.id,
        author_id: user.id,
        content,
        type: type || 'human',
        is_internal: is_internal || false,
      })

    if (responseError) {
      console.error('Error creating response:', responseError)
      return new NextResponse('Failed to create response', { status: 500 })
    }

    // Create history entry
    await supabase.from('ticket_history').insert({
      ticket_id: params.id,
      actor_id: user.id,
      action: 'add_response',
      changes: { content, is_internal, type },
    })

    // If this is a human response and not internal, trigger AI analysis
    if (type === 'human' && !is_internal) {
      // Process with AI for potential follow-up
      const aiResult = await processTicketWithAI({
        ...ticket,
        description: content // Use the new response as context
      })

      if (aiResult.canAutoResolve) {
        // AI can suggest a follow-up
        await supabase.from('ticket_responses').insert({
          ticket_id: params.id,
          content: aiResult.response,
          type: 'ai',
          author_id: null,
          is_internal: true,
          metadata: { confidence: aiResult.confidence }
        })
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Error in POST /api/tickets/[id]/responses:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

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

    const { searchParams } = new URL(req.url)
    const includeInternal = searchParams.get('internal') === 'true'

    // Get responses
    let query = supabase
      .from('ticket_responses')
      .select(`
        *,
        author:auth.users(email)
      `)
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: true })

    if (!includeInternal) {
      query = query.eq('is_internal', false)
    }

    const { data: responses, error } = await query

    if (error) throw error

    return NextResponse.json(responses)
  } catch (error) {
    console.error('Error fetching responses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 