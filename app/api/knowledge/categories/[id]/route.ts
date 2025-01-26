import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  const supabase = await createClient()

  try {
    const { data: category, error } = await supabase
      .from('kb_categories')
      .select(`
        *,
        kb_articles (
          id,
          title,
          slug,
          view_count,
          helpful_count
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!category) return new NextResponse('Category not found', { status: 404 })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    return new NextResponse('Error fetching category', { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  const supabase = await createClient()
  
  try {
    const json = await request.json()
    const { name, description, parent_id } = json

    if (!name) {
      return new NextResponse('Name is required', { status: 400 })
    }

    const { data: category, error } = await supabase
      .from('kb_categories')
      .update({
        name,
        description,
        parent_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!category) return new NextResponse('Category not found', { status: 404 })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
    return new NextResponse('Error updating category', { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  const supabase = await createClient()

  try {
    // Check if category has any articles
    const { data: articles, error: articlesError } = await supabase
      .from('kb_articles')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (articlesError) throw articlesError

    if (articles && articles.length > 0) {
      return new NextResponse(
        'Cannot delete category with articles. Please move or delete the articles first.',
        { status: 400 }
      )
    }

    // Check if category has any subcategories
    const { data: subcategories, error: subcategoriesError } = await supabase
      .from('kb_categories')
      .select('id')
      .eq('parent_id', id)
      .limit(1)

    if (subcategoriesError) throw subcategoriesError

    if (subcategories && subcategories.length > 0) {
      return new NextResponse(
        'Cannot delete category with subcategories. Please move or delete the subcategories first.',
        { status: 400 }
      )
    }

    // If no articles or subcategories, proceed with deletion
    const { error: deleteError } = await supabase
      .from('kb_categories')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting category:', error)
    return new NextResponse('Error deleting category', { status: 500 })
  }
} 