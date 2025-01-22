'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Wand2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface TicketResponseComposerProps {
  ticketId: string
  onResponseAdded?: () => void
}

export default function TicketResponseComposer({
  ticketId,
  onResponseAdded,
}: TicketResponseComposerProps) {
  const [content, setContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInternal, setIsInternal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!content.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          type: 'human',
          is_internal: isInternal,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit response')
      }

      setContent("")
      onResponseAdded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response')
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateAIResponse = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: "Let me help you with that...",
          type: 'ai',
          is_internal: isInternal,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI response')
      }

      const data = await response.json()
      setContent(data.content)
      onResponseAdded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI response')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        {error && (
          <div className="mb-4 text-sm text-red-500">{error}</div>
        )}
        <Textarea
          placeholder="Type your response..."
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          className="min-h-[100px]"
        />
        <div className="mt-2 flex items-center space-x-2">
          <Switch
            id="internal-mode"
            checked={isInternal}
            onCheckedChange={setIsInternal}
          />
          <Label htmlFor="internal-mode">Internal Note</Label>
        </div>
      </CardContent>
      <CardFooter className="px-4 pb-4 pt-0 flex justify-between">
        <Button
          variant="outline"
          onClick={generateAIResponse}
          disabled={isGenerating || isSubmitting}
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate AI Response"}
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!content.trim() || isGenerating || isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send Response"}
        </Button>
      </CardFooter>
    </Card>
  )
} 