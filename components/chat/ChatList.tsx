'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ChatSession, ChatMessage, RealtimePayload } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { Loader2, MessageCircle, Send, User, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function ChatList() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [isSending, setIsSending] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)

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

  const convertToTicket = async (session: ChatSession) => {
    if (!session || !session.chat_messages?.length) return
    
    try {
      setIsLoading(true)
      
      // Log the current user and session info
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('Current user:', user)
      console.log('Session to convert:', session)

      // Verify agent status
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', user?.id)
        .single()
      
      console.log('Agent check:', { agent, agentError })

      // Verify customer exists
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', session.user_id)
        .single()
      
      console.log('Customer check:', { customer, customerError })
      
      // Create a ticket from the chat
      const ticketData = {
        customer_id: session.user_id,
        title: 'Chat Conversation',
        description: session.chat_messages[0]?.content || 'No message content',
        source: 'chat',
        status: 'new',
        priority: 'medium',
        metadata: {
          chat_session_id: session.id,
          converted_at: new Date().toISOString(),
          converted_by: 'agent'
        }
      }
      
      console.log('Attempting to create ticket with data:', ticketData)

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert([ticketData])
        .select()
        .single()

      console.log('Ticket creation result:', { ticket, ticketError })

      if (ticketError) throw ticketError

      // Add chat transcript as first response
      const transcript = session.chat_messages
        .map(m => `${m.sender_type === 'customer' ? 'Customer' : 'Agent'}: ${m.content}`)
        .join('\n')

      const { data: response, error: responseError } = await supabase
        .from('ticket_responses')
        .insert([{
          ticket_id: ticket.id,
          content: transcript,
          type: 'chat_transcript',
          metadata: {
            chat_session_id: session.id,
            message_count: session.chat_messages.length
          }
        }])
        .select()

      console.log('Response creation result:', { response, responseError })

      if (responseError) throw responseError

      // End the chat session
      const { data: updatedSession, error: updateError } = await supabase
        .from('chat_sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString(),
          metadata: {
            ...session.metadata,
            converted_to_ticket: ticket.id
          }
        })
        .eq('id', session.id)
        .select()

      console.log('Session update result:', { updatedSession, updateError })

      if (updateError) throw updateError

      // Remove session from list
      setSessions(prev => prev.filter(s => s.id !== session.id))
      setSelectedSession(null)

      // Redirect to the new ticket
      window.location.href = `/tickets/${ticket.id}`
    } catch (error) {
      console.error('Error converting to ticket:', error)
      // Log the full error details
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full grid grid-cols-3 divide-x">
      {/* Chat List */}
      <div className="flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Active Conversations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {sessions.length} active {sessions.length === 1 ? 'chat' : 'chats'}
          </p>
        </div>
        
        <ScrollArea className="flex-1">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active chat sessions</p>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session.id)}
                  className={cn(
                    'w-full text-left p-4 hover:bg-accent/50 transition-colors',
                    selectedSession === session.id && 'bg-accent'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {(session.user?.email || session.user_id).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">
                          {session.user?.email || session.user_id}
                        </p>
                        <Badge variant="outline" className="flex-none">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(session.created_at), 'MMM d, h:mm a')}
                      </div>
                      {session.chat_messages && session.chat_messages.length > 0 && (
                        <p className="text-sm text-muted-foreground truncate mt-2">
                          {session.chat_messages[session.chat_messages.length - 1].content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Window */}
      <div className="col-span-2 flex flex-col">
        {selectedSession ? (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  Chat with {sessions.find(s => s.id === selectedSession)?.user?.email || 'Customer'}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Started {format(new Date(sessions.find(s => s.id === selectedSession)?.created_at || ''), 'PP p')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const session = sessions.find(s => s.id === selectedSession)
                  if (session) convertToTicket(session)
                }}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Convert to Ticket
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4" ref={messageContainerRef}>
              <div className="overflow-y-auto p-2 space-y-2">
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
            </ScrollArea>

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
                  className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm"
                  disabled={isSending}
                />
                <Button 
                  type="submit" 
                  disabled={isSending || !response.trim()}
                  size="icon"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="font-medium">No chat selected</p>
                <p className="text-sm">Select a conversation from the list to start responding</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 