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
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold">Active Chat Sessions</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatList />
      </div>
    </div>
  )
} 