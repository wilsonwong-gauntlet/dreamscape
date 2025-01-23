import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    // Get user IDs from request
    const { userIds } = await request.json()
    if (!Array.isArray(userIds)) {
      return new NextResponse('Invalid request', { status: 400 })
    }

    // Get user data
    const { data: users, error } = await supabase
      .from('auth.users')
      .select('id, email')
      .in('id', userIds)

    if (error) {
      console.error('Error fetching users:', error)
      return new NextResponse('Error fetching users', { status: 500 })
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error in users route:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 