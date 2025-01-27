import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const json = await request.json()
    const { isHelpful } = json

    // First check if user has already given feedback
    const { data: existingFeedback } = await supabase
      .from('kb_article_feedback')
      .select('id')
      .eq('article_id', id)
      .eq('user_id', user.id)
      .single()

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'User has already provided feedback for this article' },
        { status: 400 }
      )
    }

    // Insert feedback
    const { error: feedbackError } = await supabase
      .from('kb_article_feedback')
      .insert({
        article_id: id,
        user_id: user.id,
        is_helpful: isHelpful
      })

    if (feedbackError) {
      throw feedbackError
    }

    // Increment the appropriate counter
    const { error: incrementError } = await supabase.rpc(
      isHelpful ? 'increment_article_helpful' : 'increment_article_not_helpful',
      { article_id: id }
    )

    if (incrementError) {
      throw incrementError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's feedback for this article
    const { data: feedback, error } = await supabase
      .from('kb_article_feedback')
      .select('is_helpful')
      .eq('article_id', id)
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error
    }

    return NextResponse.json({
      hasFeedback: !!feedback,
      isHelpful: feedback?.is_helpful
    })
  } catch (error) {
    console.error('Error getting feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 