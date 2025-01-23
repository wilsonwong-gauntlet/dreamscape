'use client'

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Wand2, Loader2, MessageSquare, FileText, ThumbsUp, Bot, Lock, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Template {
  id: string
  title: string
  content: string
  tags: string[]
}

interface TicketResponseComposerProps {
  ticketId: string
  onResponseAdded: () => void
}

export default function TicketResponseComposer({ ticketId, onResponseAdded }: TicketResponseComposerProps) {
  const [content, setContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInternal, setIsInternal] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Mock templates - should come from API/database
  const templates: Template[] = [
    {
      id: '1',
      title: 'General Acknowledgment',
      content: 'Thank you for reaching out. I understand your concern about...',
      tags: ['general']
    },
    {
      id: '2',
      title: 'Status Update',
      content: 'I wanted to update you on the status of your ticket...',
      tags: ['update']
    }
  ]

  const macros = {
    '{ticket.id}': ticketId,
    '{date}': new Date().toLocaleDateString(),
    '{time}': new Date().toLocaleTimeString(),
  }

  const applyTemplate = (template: Template) => {
    let newContent = template.content
    // Replace macros
    Object.entries(macros).forEach(([key, value]) => {
      newContent = newContent.replace(key, value)
    })
    setContent(newContent)
    setShowTemplates(false)
    textareaRef.current?.focus()
  }

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
      onResponseAdded()
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
      onResponseAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI response')
    } finally {
      setIsGenerating(false)
    }
  }

  const quickActions = [
    { id: 'acknowledge', text: 'Thank you for reaching out. I understand your concern and will look into this right away.' },
    { id: 'clarify', text: 'Could you please provide more details about...?' },
    { id: 'update', text: "I wanted to give you a quick update on your ticket. Here's what we know so far:" },
    { id: 'resolve', text: "I'm pleased to inform you that we've resolved your issue. Here's what we did:" }
  ]

  const generateSuggestions = async () => {
    setIsLoadingSuggestions(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/suggest`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to generate suggestions')
      const data = await response.json()
      setAiSuggestions(data.suggestions)
    } catch (error) {
      console.error('Error generating suggestions:', error)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex items-center gap-2 pb-2 overflow-x-auto">
        <span className="text-sm font-medium text-muted-foreground shrink-0">Quick Actions:</span>
        {quickActions.map(action => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className="shrink-0 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            onClick={() => setContent(action.text)}
          >
            {action.id.charAt(0).toUpperCase() + action.id.slice(1)}
          </Button>
        ))}
      </div>

      {/* Main Composer */}
      <div className="relative">
        <div className={cn(
          "absolute left-0 right-0 -top-8 px-4 py-2 rounded-t-lg text-sm",
          error ? "bg-red-50 text-red-600" : "hidden"
        )}>
          {error}
        </div>
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your response..."
            className={cn(
              "min-h-[200px] pr-12 resize-y transition-colors",
              isInternal && "bg-gray-50/80 border-gray-200",
              error && "border-red-300"
            )}
          />
          <div className="absolute right-2 top-2 flex flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={generateSuggestions}
                    disabled={isLoadingSuggestions}
                    className={cn(
                      "h-8 w-8 transition-colors",
                      isLoadingSuggestions && "bg-indigo-50 text-indigo-600"
                    )}
                  >
                    {isLoadingSuggestions ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate AI suggestions</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
              <Bot className="h-4 w-4" />
              <span>AI Suggestions</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-gray-400 hover:text-gray-600"
              onClick={() => setAiSuggestions([])}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-2">
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="relative group rounded-md border border-indigo-100 bg-indigo-50/30 p-3 hover:bg-indigo-50 transition-colors"
              >
                <p className="text-sm pr-10">{suggestion}</p>
                <Button
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  size="icon"
                  variant="ghost"
                  onClick={() => setContent(suggestion)}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={isInternal}
              onCheckedChange={setIsInternal}
              id="internal-note"
            />
            <Label 
              htmlFor="internal-note" 
              className="text-sm flex items-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" />
              Internal Note
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowTemplates(true)}
            className="border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!content.trim() || isSubmitting}
            className={cn(
              "transition-colors",
              isInternal ? "bg-gray-900 hover:bg-gray-700" : "bg-indigo-600 hover:bg-indigo-500"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Response
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 