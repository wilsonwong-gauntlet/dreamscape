import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const { teamId, memberId } = await params
  const supabase = await createClient()

  try {
    console.log('Removing member from team:', { teamId, memberId })
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('team_id', teamId)
      .eq('id', memberId)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error removing team member:', error)
    return new NextResponse('Error removing team member', { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const { teamId, memberId } = await params
  const supabase = await createClient()
  const body = await request.json()

  try {
    console.log('Updating member role:', { teamId, memberId, role: body.role })
    const { data: agent, error } = await supabase
      .from('agents')
      .update({ role: body.role })
      .eq('team_id', teamId)
      .eq('id', memberId)
      .select()
      .single()

    if (error) throw error
    if (!agent) return new NextResponse('Member not found', { status: 404 })

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Error updating member role:', error)
    return new NextResponse('Error updating member role', { status: 500 })
  }
} 