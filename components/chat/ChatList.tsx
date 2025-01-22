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
    const { data } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        customers:user_id (
          id,
          email
        ),
        chat_messages (
          id,
          content,
          sender_type,
          created_at
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (data) {
      setSessions(data)
    }
    setIsLoading(false)
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
                    {session.customers?.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Started {format(new Date(session.created_at), 'PP p')}
                  </p>
                  {session.chat_messages?.length > 0 && (
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