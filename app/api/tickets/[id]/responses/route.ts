import { NextResponse } from 'next/server'
import type { TicketResponse } from '@/types/database'
import { processTicketWithAI } from '@/lib/ai'
import { createClient } from '@/app/utils/server'

export async function POST(
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
    const { content, is_internal = false, type = 'human' } = json

    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Create the response
    const { data: response, error } = await supabase
      .from('ticket_responses')
      .insert({
        ticket_id: params.id,
        author_id: user.id,
        content,
        type,
        is_internal,
        metadata: {}
      })
      .select()
      .single()

    if (error) throw error

    // If this is a human response and not internal, trigger AI analysis
    if (type === 'human' && !is_internal) {
      // Get the full ticket
      const { data: ticket } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', params.id)
        .single()

      if (ticket) {
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
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error creating response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      .select('*, author:auth.users(email)')
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