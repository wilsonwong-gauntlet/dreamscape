'use client'

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Bot, Loader2, MessageSquare, FileText, Lock, Search } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { adminAuthClient } from "@/utils/supabase/server"

interface Macro {
  id: string
  title: string
  content: string
  description?: string
  category?: string
  variables?: string[]
  team?: {
    id: string
    name: string
  }
}

interface TicketResponseComposerProps {
  ticketId: string
  ticket: {
    id: string
    title: string
    status: string
    priority: string
    customer_id?: string
    description: string
    source: string
    created_at: string
    updated_at: string
    customer?: {
      id: string
      company: string | null
      user: {
        id: string
        email: string
        user_metadata: {
          name?: string
          full_name?: string
        }
      }
    }
    assigned_agent?: {
      id: string
      role: string
      team_id: string | null
      email: string
      name: string
    }
    team?: {
      id: string
      name: string
    }
  }
  onResponseAdded: () => void
}

export default function TicketResponseComposer({ ticketId, ticket, onResponseAdded }: TicketResponseComposerProps) {
  const [content, setContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInternal, setIsInternal] = useState(false)
  const [showMacros, setShowMacros] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [macros, setMacros] = useState<Macro[]>([])
  const [isLoadingMacros, setIsLoadingMacros] = useState(false)
  const [macroSearch, setMacroSearch] = useState("")
  const [showVariableInput, setShowVariableInput] = useState(false)
  const [currentMacro, setCurrentMacro] = useState<Macro | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [customerData, setCustomerData] = useState<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    console.log('TicketResponseComposer mounted with ticket:', ticket)
    if (ticket.customer_id) {
      fetchCustomerData()
    }
  }, [ticket])

  useEffect(() => {
    if (showMacros) {
      loadMacros()
    }
  }, [showMacros])

  const fetchCustomerData = async () => {
    try {
      const response = await fetch(`/api/customers/${ticket.customer_id}`)
      if (!response.ok) throw new Error('Failed to fetch customer data')
      const data = await response.json()
      setCustomerData(data)
      console.log('Fetched customer data:', data)
    } catch (error) {
      console.error('Error fetching customer data:', error)
    }
  }

  const loadMacros = async () => {
    try {
      setIsLoadingMacros(true)
      const response = await fetch('/api/macros')
      if (!response.ok) throw new Error('Failed to load macros')
      const data = await response.json()
      setMacros(data)
    } catch (error) {
      console.error('Error loading macros:', error)
      toast.error('Failed to load macros')
    } finally {
      setIsLoadingMacros(false)
    }
  }

  const applyMacro = (macro: Macro) => {
    if (macro.variables && macro.variables.length > 0) {
      setCurrentMacro(macro)
      setVariableValues({})
      setShowVariableInput(true)
      return
    }

    applyMacroContent(macro, {})
  }

  const applyMacroContent = (macro: Macro, variables: Record<string, string>) => {
    let newContent = macro.content
    
    console.log('Starting macro content:', newContent)
    console.log('Ticket data:', JSON.stringify(ticket, null, 2))
    console.log('Customer data:', JSON.stringify(customerData, null, 2))

    // Replace built-in variables with null checks
    const builtInVariables = {
      // Ticket info
      '{ticket.id}': ticket?.id || '',
      '{ticket.title}': ticket?.title || '',
      '{ticket.status}': ticket?.status || '',
      '{ticket.priority}': ticket?.priority || '',
      '{ticket.source}': ticket?.source || '',
      '{ticket.description}': ticket?.description || '',
      
      // Customer info
      '{customer.id}': customerData?.user?.id || ticket?.customer?.id || '',
      '{customer.name}': customerData?.user?.user_metadata?.name || customerData?.user?.email || ticket?.customer?.user?.user_metadata?.full_name || ticket?.customer?.user?.email || '',
      '{customer.email}': customerData?.user?.email || ticket?.customer?.user?.email || '',
      '{customer.created_at}': new Date(customerData?.user?.created_at || '').toLocaleDateString() || '',
      
      // Agent info
      '{agent.name}': ticket?.assigned_agent?.name || ticket?.assigned_agent?.email || '',
      '{agent.email}': ticket?.assigned_agent?.email || '',
      '{agent.role}': ticket?.assigned_agent?.role || '',
      
      // Team info
      '{team.name}': ticket?.team?.name || '',
      '{team.id}': ticket?.team?.id || '',
      
      // Timestamps
      '{date}': new Date().toLocaleDateString(),
      '{time}': new Date().toLocaleTimeString(),
      '{ticket.created_at}': new Date(ticket?.created_at || '').toLocaleDateString(),
      '{ticket.updated_at}': new Date(ticket?.updated_at || '').toLocaleDateString(),
    }

    console.log('Built-in variables values:', JSON.stringify(builtInVariables, null, 2))

    // Replace all built-in variables
    Object.entries(builtInVariables).forEach(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapedKey, 'g')
      console.log(`Replacing ${key} (escaped as ${escapedKey}) with "${value}"`)
      newContent = newContent.replace(regex, value)
      console.log('Content after replacement:', newContent)
    })

    // Replace custom variables
    Object.entries(variables).forEach(([key, value]) => {
      console.log(`Replacing custom variable {${key}} with "${value}"`)
      newContent = newContent.replace(new RegExp(`{${key}}`, 'g'), value)
      console.log('Content after custom replacement:', newContent)
    })

    console.log('Final content:', newContent)
    setContent(newContent)
    setShowMacros(false)
    setShowVariableInput(false)
    textareaRef.current?.focus()
  }

  const handleVariableSubmit = () => {
    if (!currentMacro) return

    // Check if all variables have values
    const missingVariables = currentMacro.variables?.filter(v => !variableValues[v]) || []
    if (missingVariables.length > 0) {
      toast.error(`Please fill in all variables: ${missingVariables.join(', ')}`)
      return
    }

    applyMacroContent(currentMacro, variableValues)
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
      // Get AI response from edge function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-ticket-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          ticketId: ticketId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Edge function error:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to generate AI response')
      }

      const { response: aiResponse } = await response.json()

      // Save AI response to database
      const saveResponse = await fetch(`/api/tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: aiResponse,
          type: 'ai',
          is_internal: isInternal,
        }),
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save AI response')
      }

      setContent(aiResponse)
      onResponseAdded()
    } catch (err) {
      console.error('Error generating AI response:', err)
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

  const filteredMacros = macros.filter(macro => 
    macro.title.toLowerCase().includes(macroSearch.toLowerCase()) ||
    macro.description?.toLowerCase().includes(macroSearch.toLowerCase()) ||
    macro.category?.toLowerCase().includes(macroSearch.toLowerCase())
  )

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
                    onClick={generateAIResponse}
                    disabled={isGenerating}
                    className={cn(
                      "h-8 w-8 transition-colors",
                      isGenerating && "bg-indigo-50 text-indigo-600"
                    )}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate AI response</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

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
            onClick={() => setShowMacros(true)}
            className="border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Macros
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

      {/* Variable Input Dialog */}
      <Dialog open={showVariableInput} onOpenChange={(open) => {
        if (!open) {
          setShowVariableInput(false)
          setCurrentMacro(null)
          setVariableValues({})
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Variable Values</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentMacro?.variables?.map((variable) => (
              <div key={variable} className="space-y-2">
                <Label htmlFor={variable}>{variable}</Label>
                <Input
                  id={variable}
                  value={variableValues[variable] || ''}
                  onChange={(e) => setVariableValues(prev => ({
                    ...prev,
                    [variable]: e.target.value
                  }))}
                  placeholder={`Enter value for ${variable}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowVariableInput(false)
              setCurrentMacro(null)
              setVariableValues({})
            }}>
              Cancel
            </Button>
            <Button onClick={handleVariableSubmit}>
              Apply Macro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Macros Dialog */}
      <Dialog open={showMacros} onOpenChange={setShowMacros}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Response Macros</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search macros..."
                value={macroSearch}
                onChange={(e) => setMacroSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
              {isLoadingMacros ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMacros.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No macros found
                </div>
              ) : (
                filteredMacros.map(macro => (
                  <Card key={macro.id} className="cursor-pointer hover:bg-accent/5" onClick={() => applyMacro(macro)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="font-medium">{macro.title}</h4>
                          {macro.description && (
                            <p className="text-sm text-muted-foreground">{macro.description}</p>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            {macro.category && (
                              <Badge variant="secondary" className="bg-accent/50">
                                {macro.category}
                              </Badge>
                            )}
                            {macro.team && (
                              <Badge variant="outline">
                                {macro.team.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 