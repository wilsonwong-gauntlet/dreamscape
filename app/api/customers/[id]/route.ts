import { NextResponse } from 'next/server'
import { adminAuthClient } from '@/utils/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  try {
    const { data: { user }, error } = await adminAuthClient.getUserById(id)
    
    if (error) {
      console.error('Error fetching user:', error)
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in customer GET route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 