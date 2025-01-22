import { createClient } from '@/utils/supabase/server'
import { ChatList } from '@/components/chat/ChatList'
import { redirect } from 'next/navigation'

export default async function ChatsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get agent role
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!agent) {
    redirect('/dashboard')
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-semibold mb-6">Active Chat Sessions</h1>
      <ChatList />
    </div>
  )
} 