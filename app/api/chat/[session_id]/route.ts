import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request
) {
  try {
    const supabase = await createClient()
    
    // Verify agent auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Verify agent role
    const { data: agent } = await supabase
      .from('agents')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!agent) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get request body
    const { content } = await request.json()
    if (!content) {
      return new NextResponse('Content is required', { status: 400 })
    }

    // Verify chat session exists and is active
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id, status')
      .eq('id', params.session_id)
      .single()

    if (!session) {
      return new NextResponse('Chat session not found', { status: 404 })
    }

    if (session.status !== 'active') {
      return new NextResponse('Chat session is not active', { status: 400 })
    }

    // Create agent response
    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: params.session_id,
        sender_id: user.id,
        sender_type: 'agent',
        content
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating message:', error)
      return new NextResponse('Error creating message', { status: 500 })
    }

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error in chat response:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 