import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: categories, error } = await supabase
      .from('kb_categories')
      .select(`
        id,
        name,
        slug,
        description,
        parent_id,
        kb_articles (count)
      `)
      .order('name')

    if (error) throw error

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return new NextResponse('Error fetching categories', { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const json = await request.json()
    const { name, description, parent_id } = json

    if (!name) {
      return new NextResponse('Name is required', { status: 400 })
    }

    const { data: category, error } = await supabase
      .from('kb_categories')
      .insert([
        {
          name,
          description,
          parent_id
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating category:', error)
    return new NextResponse('Error creating category', { status: 500 })
  }
} 