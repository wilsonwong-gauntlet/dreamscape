'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Loader2, Bot, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Response {
  id: string
  content: string
  type: 'ai' | 'human'
  is_internal: boolean
  created_at: string
  author: {
    email: string
  }
}

interface TicketResponsesProps {
  ticketId: string
  responses: Response[]
}

export function TicketResponses({ ticketId, responses }: TicketResponsesProps) {
  const router = useRouter()
  const [newResponse, setNewResponse] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const handleSubmit = async () => {
    if (!newResponse.trim()) return

    try {
      setIsSubmitting(true)
      
      // Match the actual database columns
      const payload = {
        content: newResponse.trim(),
        is_internal: isInternal,  // Changed back to is_internal
        type: 'human'
      }

      const response = await fetch(`/api/tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      // Get the response text first to see what's actually being returned
      const responseText = await response.text()
      console.log('Response:', responseText) // Log the full response for debugging
      
      if (!response.ok) {
        // Try to parse as JSON if possible
        let errorMessage = 'Failed to add response'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If it's not JSON, use the text directly
          errorMessage = responseText
        }
        
        throw new Error(errorMessage)
      }

      setNewResponse('')
      toast.success('Response added successfully')
      router.refresh()
    } catch (error) {
      console.error('Error adding response:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add response')
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateAIResponse = async () => {
    try {
      setIsGeneratingAI(true)
      const response = await fetch(`/api/tickets/${ticketId}/ai-response`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI response')
      }

      const data = await response.json()
      setNewResponse(data.response)
      toast.success('AI response generated')
    } catch (error) {
      console.error('Error generating AI response:', error)
      toast.error('Failed to generate AI response')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Responses</h2>
        <div className="space-y-4">
          {responses.map((response) => (
            <div
              key={response.id}
              className={`p-4 rounded-lg ${
                response.is_internal ? 'bg-muted' : 'bg-background border'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">{response.author.email}</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(response.created_at), 'MMM d, yyyy h:mm a')}
                </span>
                {response.is_internal && (
                  <Badge variant="secondary">Internal</Badge>
                )}
                {response.type === 'ai' && (
                  <Badge variant="outline" className="gap-1">
                    <Bot className="h-3 w-3" />
                    AI Generated
                  </Badge>
                )}
              </div>
              <p className="whitespace-pre-wrap">{response.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Add Response</h3>
        <div className="space-y-4">
          <Textarea
            placeholder="Type your response..."
            value={newResponse}
            onChange={(e) => setNewResponse(e.target.value)}
            rows={4}
          />

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !newResponse.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-2">
                {isSubmitting ? 'Sending...' : 'Send Response'}
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsInternal(!isInternal)}
              disabled={isSubmitting}
            >
              {isInternal ? 'Internal Note' : 'Public Response'}
            </Button>
            <Button
              variant="outline"
              onClick={generateAIResponse}
              disabled={isGeneratingAI || isSubmitting}
            >
              {isGeneratingAI ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              <span className="ml-2">
                {isGeneratingAI ? 'Generating...' : 'Generate AI Response'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 