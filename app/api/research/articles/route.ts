import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import slugify from 'slugify'
import { addDocumentToVectorStore } from '@/utils/langchain'

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
  try {
    const supabase = await createClient()
    const json = await request.json()

    // Generate slug from title
    const slug = slugify(json.title, { lower: true, strict: true })

    // Create article first
    const { data, error } = await supabase
      .from('kb_articles')
      .insert([
        {
          title: json.title,
          content: json.content,
          category_id: json.category_id,
          status: json.status,
          slug: slug,
          metadata: json.metadata || {}
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating article:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add to vector store
    try {
      await addDocumentToVectorStore({
        title: json.title,
        content: json.content,
        metadata: {
          id: data.id,
          slug: slug,
          category_id: json.category_id,
          status: json.status,
          ...json.metadata
        }
      })
    } catch (vectorError) {
      console.error('Error adding to vector store:', vectorError)
      // Don't fail the request if vector store update fails
      // but log it for monitoring
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/knowledge/articles:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 