import { NextResponse } from 'next/server'
import { testRouting } from '@/app/test/routing.test'

export async function POST() {
  try {
    await testRouting()
    return NextResponse.json({ message: 'Test completed. Check server logs.' })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    )
  }
} 