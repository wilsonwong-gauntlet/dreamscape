import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import slugify from 'slugify'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  try {
    const supabase = await createClient()
    const json = await request.json()

    console.log('Updating article with ID:', id)
    console.log('Update data:', json)

    // Generate new slug if title changed
    const slug = slugify(json.title, { lower: true, strict: true })
    console.log('Generated slug:', slug)

    // First verify the article exists
    const { data: existing, error: findError } = await supabase
      .from('kb_articles')
      .select('id')
      .eq('id', id)
      .single()

    if (findError || !existing) {
      console.error('Article not found:', id)
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Update article
    const { data, error } = await supabase
      .from('kb_articles')
      .update({
        title: json.title,
        content: json.content,
        category_id: json.category_id,
        status: json.status,
        slug: slug,
        metadata: json.metadata || {}
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating article:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('kb_articles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting article:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 