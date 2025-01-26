import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug
  const supabase = await createClient()

  try {
    const { data: article, error } = await supabase
      .from('kb_articles')
      .select(`
        *,
        kb_categories (
          name,
          slug
        )
      `)
      .eq('slug', slug)
      .single()

    if (error) throw error
    if (!article) return new NextResponse('Article not found', { status: 404 })

    // Increment view count
    await supabase.rpc('increment_article_views', {
      article_id: article.id
    })

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error fetching article:', error)
    return new NextResponse('Error fetching article', { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug
  const supabase = await createClient()
  
  try {
    const json = await request.json()
    const { title, content, category_id, status } = json

    if (!title || !content) {
      return new NextResponse('Title and content are required', { status: 400 })
    }

    const { data: article, error } = await supabase
      .from('kb_articles')
      .update({
        title,
        content,
        category_id,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('slug', slug)
      .select()
      .single()

    if (error) throw error
    if (!article) return new NextResponse('Article not found', { status: 404 })

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error updating article:', error)
    return new NextResponse('Error updating article', { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('kb_articles')
      .delete()
      .eq('slug', slug)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting article:', error)
    return new NextResponse('Error deleting article', { status: 500 })
  }
} 