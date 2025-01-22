'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ChatSession, ChatMessage, RealtimePayload } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { Loader2, MessageCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomerInfo {
  id: string
  email: string
  company: string | null
  metadata: Record<string, any> | null
}

export function ChatList() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [isSending, setIsSending] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const [customerInfo, setCustomerInfo] = useState<Record<string, CustomerInfo>>({})

  // Scroll when messages change or when chat is selected
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight
    }
  }, [selectedSession, sessions])

  // Single effect to handle all subscriptions
  useEffect(() => {
    let mounted = true
    console.log('Setting up chat subscriptions')

    async function setupSubscriptions() {
      try {
        // Verify agent status first
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
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

        // Load initial sessions
        await loadActiveSessions()
        
        if (!mounted) return

        // Set up realtime subscriptions
        const channel = supabase.channel('agent_chat')
        channelRef.current = channel

        channel
          .on(
            'postgres_changes' as any,
            {
              event: '*',
              schema: 'public',
              table: 'chat_sessions',
              filter: 'status=eq.active'
            },
            (payload: RealtimePayload<ChatSession>) => {
              if (!mounted) return
              console.log('Session change received:', payload)
              
              if (payload.eventType === 'DELETE' || (payload.eventType === 'UPDATE' && payload.new.status === 'ended')) {
                setSessions(prev => prev.filter(s => s.id !== payload.old?.id))
              } else if (payload.eventType === 'INSERT') {
                loadActiveSessions()
              }
            }
          )
          .on(
            'postgres_changes' as any,
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages'
            },
            (payload: RealtimePayload<ChatMessage>) => {
              if (!mounted) return
              console.log('Message received:', payload)

              setSessions(prev => prev.map(session => {
                if (session.id === payload.new.session_id) {
                  return {
                    ...session,
                    chat_messages: [...(session.chat_messages || []), payload.new]
                  }
                }
                return session
              }))
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status)
          })

      } catch (error) {
        console.error('Setup error:', error)
      }
    }

    setupSubscriptions()

    return () => {
      mounted = false
      if (channelRef.current) {
        console.log('Cleaning up subscriptions')
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [supabase]) // Only depend on supabase client

  const fetchCustomerInfo = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/customers/${userId}`)
      if (!response.ok) return
      const data = await response.json()
      setCustomerInfo(prev => ({
        ...prev,
        [userId]: data
      }))
    } catch (error) {
      console.error('Error fetching customer info:', error)
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

      // Get all active sessions grouped by user_id
      const { data: allSessions, error: sessionsError } = await supabase
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

      if (!allSessions) {
        setSessions([])
        return
      }

      // Group sessions by user_id
      const sessionsByUser = allSessions.reduce((acc, session) => {
        if (!acc[session.user_id]) {
          acc[session.user_id] = []
        }
        acc[session.user_id].push(session)
        return acc
      }, {} as Record<string, typeof allSessions>)

      // For each user, keep only the most recent session and end others
      const sessionsToKeep: typeof allSessions = []
      const sessionsToEnd: string[] = []

      for (const [userId, userSessions] of Object.entries(sessionsByUser)) {
        // Keep the most recent session
        sessionsToKeep.push(userSessions[0])
        
        // Mark older sessions for ending
        if (userSessions.length > 1) {
          const olderSessionIds = userSessions.slice(1).map(s => s.id)
          sessionsToEnd.push(...olderSessionIds)
        }
      }

      // End older sessions
      if (sessionsToEnd.length > 0) {
        console.log('Ending older sessions:', sessionsToEnd)
        await supabase
          .from('chat_sessions')
          .update({ status: 'ended' })
          .in('id', sessionsToEnd)
      }

      // For now, just use the user_id as we can't get email from client side
      const sessionsWithUsers = sessionsToKeep.map(session => ({
        ...session,
        user: { id: session.user_id, email: session.user_id }
      })) as ChatSession[]

      // After setting sessions, fetch customer info for each
      sessionsWithUsers.forEach(session => {
        fetchCustomerInfo(session.user_id)
      })

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Direct database insert like customer side
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          session_id: sessionId,
          sender_id: user.id,
          sender_type: 'agent',
          content: response.trim()
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      // Optimistically update local state
      if (data) {
        setSessions(prev => prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              chat_messages: [...(session.chat_messages || []), data]
            }
          }
          return session
        }))
      }

      setResponse('')
      // Don't close the chat window
      // setSelectedSession(null) - Removed this line
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
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        {/* Chat List Sidebar */}
        <div className="col-span-1 border rounded-lg bg-background overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/40">
            <h2 className="font-semibold">Active Chats</h2>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {sessions.length === 0 ? (
              <p className="p-4 text-muted-foreground">No active chat sessions</p>
            ) : (
              <div className="divide-y">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session.id)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                      selectedSession === session.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium truncate">
                          {customerInfo[session.user_id]?.email || `Customer ${session.user_id.slice(0, 6)}`}
                          {customerInfo[session.user_id]?.company && (
                            <span className="block text-sm text-muted-foreground">
                              {customerInfo[session.user_id].company}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.created_at), 'PP p')}
                        </p>
                      </div>
                      {session.chat_messages && session.chat_messages.length > 0 && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                          {session.chat_messages.length}
                        </span>
                      )}
                    </div>
                    {session.chat_messages && session.chat_messages.length > 0 && (
                      <p className="mt-1 text-sm text-muted-foreground truncate">
                        {session.chat_messages[session.chat_messages.length - 1].content}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="col-span-2 border rounded-lg bg-background overflow-hidden flex flex-col">
          {selectedSession ? (
            <>
              <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    {customerInfo[sessions.find(s => s.id === selectedSession)?.user_id || '']?.email || 
                     `Customer ${sessions.find(s => s.id === selectedSession)?.user_id.slice(0, 6)}`}
                  </h3>
                  {customerInfo[sessions.find(s => s.id === selectedSession)?.user_id || '']?.company && (
                    <p className="text-sm text-muted-foreground">
                      {customerInfo[sessions.find(s => s.id === selectedSession)?.user_id || ''].company}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Started {format(new Date(sessions.find(s => s.id === selectedSession)?.created_at || ''), 'PP p')}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const session = sessions.find(s => s.id === selectedSession)
                    if (!session) return
                    
                    try {
                      // Create a ticket from the chat
                      const { data: ticket, error: ticketError } = await supabase
                        .from('tickets')
                        .insert([{
                          customer_id: session.user_id,
                          title: 'Chat Conversation',
                          description: 'Converted from chat session',
                          source: 'chat',
                          status: 'new',
                          priority: 'medium',
                          metadata: {
                            chat_session_id: session.id
                          }
                        }])
                        .select()
                        .single()

                      if (ticketError) throw ticketError

                      // Add chat transcript as first response
                      const transcript = session.chat_messages?.map(m => 
                        `${m.sender_type}: ${m.content}`
                      ).join('\n')

                      await supabase
                        .from('ticket_responses')
                        .insert([{
                          ticket_id: ticket.id,
                          author_id: session.user_id,
                          content: transcript || '',
                          type: 'human',
                          is_internal: true,
                          metadata: {
                            source: 'chat_transcript'
                          }
                        }])

                      // End chat session
                      await supabase
                        .from('chat_sessions')
                        .update({ status: 'ended' })
                        .eq('id', session.id)

                      // Redirect to ticket
                      window.location.href = `/tickets/${ticket.id}`
                    } catch (error) {
                      console.error('Error converting to ticket:', error)
                    }
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Convert to Ticket
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messageContainerRef}>
                {sessions.find(s => s.id === selectedSession)?.chat_messages?.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col space-y-1",
                      message.sender_type === 'customer' ? 'items-start' : 'items-end'
                    )}
                  >
                    <div
                      className={cn(
                        "px-3 py-2 rounded-lg max-w-[85%] break-words",
                        message.sender_type === 'customer' 
                          ? 'bg-muted rounded-bl-none'
                          : 'bg-primary text-primary-foreground rounded-br-none'
                      )}
                    >
                      {message.content}
                    </div>
                    <span className="text-xs text-muted-foreground px-1">
                      {format(new Date(message.created_at), 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (selectedSession) {
                      sendResponse(selectedSession)
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type your response..."
                    className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    className={cn(
                      "p-2 rounded-lg bg-primary text-primary-foreground",
                      isSending ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/90"
                    )}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="sr-only">Send message</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a chat to start responding
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 