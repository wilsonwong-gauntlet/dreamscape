'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { ChatMessage, ChatSession, RealtimePayload } from '@/lib/types'
import { format } from 'date-fns'
import { Loader2, Send } from 'lucide-react'

interface ChatWindowProps {
  isOpen: boolean
  className?: string
}

export function ChatWindow({ isOpen, className }: ChatWindowProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [session, setSession] = useState<ChatSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messageContainerRef = useRef<HTMLDivElement>(null)

  // Load or create chat session when opened
  useEffect(() => {
    if (isOpen) {
      initializeChat()
    }
  }, [isOpen])

  // Subscribe to new messages
  useEffect(() => {
    if (session?.id) {
      const channel = supabase
        .channel(`chat:${session.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${session.id}`
        }, (payload: RealtimePayload<ChatMessage>) => {
          setMessages((prev) => {
            // Check if message already exists
            if (prev.some(msg => msg.id === payload.new.id)) {
              return prev
            }
            return [...prev, payload.new]
          })
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [session?.id])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight
    }
  }, [messages])

  const loadMessages = async (sessionId: string) => {
    const { data: messagesData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesData) {
      setMessages(messagesData)
    }
  }

  const initializeChat = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        return
      }

      // Verify user is a customer
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!customer) {
        console.error('Not a customer')
        return
      }

      // Check for existing active session
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select()
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (sessionError) {
        console.error('Error checking existing session:', sessionError)
        return
      }

      if (existingSession) {
        console.log('Found existing session:', existingSession.id)
        setSession(existingSession)
        await loadMessages(existingSession.id)
        return
      }

      // Create a new chat session
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert([
          { 
            user_id: user.id,
            status: 'active'
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('Error creating chat session:', createError)
        return
      }

      console.log('Created new session:', newSession.id)
      setSession(newSession)
    } catch (error) {
      console.error('Error initializing chat:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (content: string) => {
    if (!session || !content.trim() || isSending) return

    setIsSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newMessage = {
        session_id: session.id,
        sender_id: user.id,
        sender_type: 'customer',
        content: content.trim()
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([newMessage])
        .select()
        .single()

      if (error) {
        console.error('Error sending message:', error)
        return
      }

      // Optimistically update local state
      if (data) {
        setMessages(prev => [...prev, data])
      }
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <Card className={cn(
      'fixed bottom-20 right-4 w-80 h-[32rem] flex flex-col shadow-xl bg-background',
      className
    )}>
      <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
        <h3 className="font-semibold">Support Chat</h3>
        {messages.length > 0 && (
          <button
            onClick={async () => {
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
                const transcript = messages.map(m => 
                  `${m.sender_type}: ${m.content}`
                ).join('\n')

                await supabase
                  .from('ticket_responses')
                  .insert([{
                    ticket_id: ticket.id,
                    author_id: session.user_id,
                    content: transcript,
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
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Convert to Ticket
          </button>
        )}
      </div>

      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-muted-foreground">
            Start a conversation...
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex flex-col space-y-1',
                message.sender_type === 'customer' ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'px-3 py-2 rounded-lg max-w-[85%] break-words',
                  message.sender_type === 'customer' 
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted rounded-bl-none'
                )}
              >
                {message.content}
              </div>
              <span className="text-xs text-muted-foreground px-1">
                {format(new Date(message.created_at), 'HH:mm')}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement
            if (input.value) {
              sendMessage(input.value)
              input.value = ''
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            name="message"
            placeholder="Type a message..."
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
    </Card>
  )
} 