'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ChatSession } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { Loader2, MessageCircle } from 'lucide-react'

export function ChatList() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    loadActiveSessions()
    
    // Subscribe to new sessions and status changes
    const channel = supabase
      .channel('chat_sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_sessions'
      }, () => {
        loadActiveSessions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadActiveSessions = async () => {
    try {
      // First verify the user is an agent
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        return
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('id, role')
        .eq('id', user.id)
        .single()

      if (!agent) {
        console.error('Not an agent')
        return
      }

      // Then load active sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          user_id,
          status,
          created_at,
          ended_at,
          metadata,
          chat_messages (
            id,
            session_id,
            sender_id,
            sender_type,
            content,
            created_at,
            read_at,
            metadata
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError)
        return
      }

      if (!sessions) {
        setSessions([])
        return
      }

      // For now, just use the user_id as we can't get email from client side
      const sessionsWithUsers = sessions.map(session => ({
        ...session,
        user: { id: session.user_id, email: session.user_id }
      })) as ChatSession[]

      setSessions(sessionsWithUsers)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendResponse = async (sessionId: string) => {
    if (!response.trim() || isSending) return

    setIsSending(true)
    try {
      const res = await fetch(`/api/chat/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: response.trim() })
      })

      if (!res.ok) {
        throw new Error('Failed to send response')
      }

      setResponse('')
      setSelectedSession(null)
      // Reload sessions to get the latest messages
      loadActiveSessions()
    } catch (error) {
      console.error('Error sending response:', error)
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Active Chats</h2>
      
      {sessions.length === 0 ? (
        <p className="text-muted-foreground">No active chat sessions</p>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {session.user?.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Started {format(new Date(session.created_at), 'PP p')}
                  </p>
                  {session.chat_messages && session.chat_messages.length > 0 && (
                    <p className="mt-2 text-sm">
                      Latest: {session.chat_messages[session.chat_messages.length - 1].content}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setSelectedSession(session.id)}
                  className="p-2 hover:bg-muted rounded-md"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>

              {selectedSession === session.id && (
                <div className="mt-4 space-y-4">
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type your response..."
                    className="w-full min-h-[100px] p-2 text-sm rounded-md border"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedSession(null)}
                      className="px-3 py-1 text-sm hover:bg-muted rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => sendResponse(session.id)}
                      disabled={isSending}
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Send'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 