'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

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

  const handleSubmit = async () => {
    if (!newResponse.trim()) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newResponse,
          is_internal: isInternal,
          type: 'human',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add response')
      }

      setNewResponse('')
      router.refresh()
    } catch (error) {
      console.error('Error adding response:', error)
    } finally {
      setIsSubmitting(false)
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
                  <Badge variant="outline">AI Generated</Badge>
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
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !newResponse.trim()}
            >
              {isSubmitting ? 'Sending...' : 'Send Response'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsInternal(!isInternal)}
              disabled={isSubmitting}
            >
              {isInternal ? 'Internal Note' : 'Public Response'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 