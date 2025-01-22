'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { ChatMessage, ChatSession, RealtimePayload } from '@/lib/types'

interface ChatWindowProps {
  isOpen: boolean
  className?: string
}

export function ChatWindow({ isOpen, className }: ChatWindowProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [session, setSession] = useState<ChatSession | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && !session) {
      initializeChat()
    }
  }, [isOpen])

  useEffect(() => {
    if (session?.id) {
      const channel = supabase
        .channel(`chat:${session.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${session.id}`
        }, (payload: RealtimePayload<ChatMessage>) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new])
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [session?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Create a new chat session
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert([
        { user_id: user.id }
      ])
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating chat session:', sessionError)
      return
    }

    setSession(sessionData)

    // Load existing messages
    const { data: messagesData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionData.id)
      .order('created_at', { ascending: true })

    if (messagesData) {
      setMessages(messagesData)
    }
  }

  const sendMessage = async (content: string) => {
    if (!session || !content.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: session.id,
          sender_id: user.id,
          sender_type: 'customer',
          content: content.trim()
        }
      ])

    if (error) {
      console.error('Error sending message:', error)
    }
  }

  if (!isOpen) return null

  return (
    <Card className={cn(
      'fixed bottom-20 right-4 w-80 h-96 flex flex-col shadow-xl',
      className
    )}>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'mb-4 p-2 rounded-lg max-w-[80%]',
              message.sender_type === 'customer'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'bg-muted'
            )}
          >
            {message.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
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
            className="flex-1 rounded-md border p-2"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Send
          </button>
        </form>
      </div>
    </Card>
  )
} 