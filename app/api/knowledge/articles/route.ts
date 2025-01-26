import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'published'
  const supabase = await createClient()

  const { data: articles, error } = await supabase
    .from('kb_articles')
    .select(`
      id,
      title,
      slug,
      content,
      status,
      category_id,
      kb_categories (
        name,
        slug
      ),
      view_count,
      helpful_count,
      created_at,
      updated_at
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(articles)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const json = await request.json()
    const { title, content, category_id, status = 'draft' } = json

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('kb_articles')
      .insert([
        {
          title,
          content,
          category_id,
          status
        }
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
} 