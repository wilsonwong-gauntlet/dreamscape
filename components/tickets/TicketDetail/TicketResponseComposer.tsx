'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Wand2 } from "lucide-react"

interface TicketResponseComposerProps {
  ticketId: string
}

export default function TicketResponseComposer({
  ticketId,
}: TicketResponseComposerProps) {
  const [content, setContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return

    // This would be replaced with your API call
    console.log("Submitting response:", { ticketId, content })
    setContent("")
  }

  const generateAIResponse = async () => {
    setIsGenerating(true)
    try {
      // This would be replaced with your AI API call
      const aiResponse = "This is a sample AI-generated response..."
      setContent(aiResponse)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <Textarea
          placeholder="Type your response..."
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          className="min-h-[100px]"
        />
      </CardContent>
      <CardFooter className="px-4 pb-4 pt-0 flex justify-between">
        <Button
          variant="outline"
          onClick={generateAIResponse}
          disabled={isGenerating}
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate AI Response"}
        </Button>
        <Button onClick={handleSubmit} disabled={!content.trim()}>
          Send Response
        </Button>
      </CardFooter>
    </Card>
  )
} 