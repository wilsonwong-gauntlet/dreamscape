import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Add CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Add OPTIONS handler
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

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

    return NextResponse.json(categories, { headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return new NextResponse('Error fetching categories', { 
      status: 500,
      headers: corsHeaders
    })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const json = await request.json()
    const { name, description, parent_id } = json

    if (!name) {
      return new NextResponse('Name is required', { 
        status: 400,
        headers: corsHeaders
      })
    }

    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const { data: category, error } = await supabase
      .from('kb_categories')
      .insert([
        {
          name,
          slug,
          description,
          parent_id
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(category, { headers: corsHeaders })
  } catch (error) {
    console.error('Error creating category:', error)
    return new NextResponse('Error creating category', { 
      status: 500,
      headers: corsHeaders
    })
  }
} 