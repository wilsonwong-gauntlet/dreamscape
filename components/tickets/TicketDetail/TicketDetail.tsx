'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { MoreHorizontal, Clock, User, Tag, History, ChevronDown, ChevronUp, MessageSquare } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import type { Ticket } from "@/types/database"
import TicketResponseList from "./TicketResponseList"
import TicketResponseComposer from "./TicketResponseComposer"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { TicketActions } from "@/components/tickets/TicketActions"
import { toast } from "sonner"

type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

interface Response {
  id: string
  content: string
  type: 'ai' | 'human'
  is_internal: boolean
  created_at: string
  author?: {
    id: string
    email: string
    user_metadata: {
      name?: string
    }
  }
}

interface HistoryEntry {
  id: string
  action: string
  actor: string
  timestamp: string
  details?: string
}

interface LocalTicket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  created_at: string
  team?: {
    id: string
    name: string
  }
  assigned_agent?: {
    id: string
    name?: string
    email: string
  }
  tags: string[]
  history: HistoryEntry[]
  responses: Response[]
}

interface TicketDetailProps {
  ticket: LocalTicket
  teams: {
    id: string
    name: string
  }[]
  agents: {
    id: string
    name?: string
    email: string
    team_id: string | null
  }[]
  currentUserId: string
  onStatusChange: (status: TicketStatus) => Promise<void>
  onPriorityChange: (priority: TicketPriority) => Promise<void>
  onTeamChange: (teamId: string) => Promise<void>
  onAssigneeChange: (agentId: string) => Promise<void>
  onTagsChange: (tags: string[]) => Promise<void>
}

const ITEMS_PER_PAGE = 5

export default function TicketDetail({
  ticket: initialTicket,
  teams,
  agents,
  currentUserId,
  onStatusChange,
  onPriorityChange,
  onTeamChange,
  onAssigneeChange,
  onTagsChange,
}: TicketDetailProps) {
  const [ticket, setTicket] = useState<LocalTicket>(initialTicket)
  const [newTag, setNewTag] = useState("")
  const [responseKey, setResponseKey] = useState(0)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true)
  const [isResponsesExpanded, setIsResponsesExpanded] = useState(true)
  
  // Calculate total pages
  const totalHistoryPages = Math.ceil((ticket.history?.length || 0) / ITEMS_PER_PAGE)
  const totalResponsePages = Math.ceil((ticket.responses?.length || 0) / ITEMS_PER_PAGE)
  
  // Initialize to last page
  const [historyPage, setHistoryPage] = useState(totalHistoryPages || 1)
  const [responsesPage, setResponsesPage] = useState(totalResponsePages || 1)

  useEffect(() => {
    setTicket(initialTicket)
  }, [initialTicket])
  
  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      setTicket(prev => ({
        ...prev,
        status: newStatus,
        history: [
          {
            id: Date.now().toString(),
            action: 'update',
            actor: 'You',
            timestamp: new Date().toISOString(),
            details: `Changed status to "${newStatus}"`
          },
          ...prev.history
        ]
      }))
      await onStatusChange(newStatus)
    } catch (error) {
      setTicket(prev => ({
        ...prev,
        status: prev.status
      }))
      toast.error("Failed to update status")
    }
  }

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    try {
      setTicket(prev => ({
        ...prev,
        priority: newPriority,
        history: [
          {
            id: Date.now().toString(),
            action: 'update',
            actor: 'You',
            timestamp: new Date().toISOString(),
            details: `Changed priority to "${newPriority}"`
          },
          ...prev.history
        ]
      }))
      await onPriorityChange(newPriority)
    } catch (error) {
      setTicket(prev => ({
        ...prev,
        priority: prev.priority
      }))
      toast.error("Failed to update priority")
    }
  }

  const handleTeamChange = async (teamId: string) => {
    const newTeam = teams.find(t => t.id === teamId)
    if (!newTeam) return

    try {
      setTicket(prev => ({
        ...prev,
        team: newTeam,
        history: [
          {
            id: Date.now().toString(),
            action: 'update',
            actor: 'You',
            timestamp: new Date().toISOString(),
            details: `Changed team to "${newTeam.name}"`
          },
          ...prev.history
        ]
      }))
      await onTeamChange(teamId)
    } catch (error) {
      setTicket(prev => ({
        ...prev,
        team: prev.team
      }))
      toast.error("Failed to update team")
    }
  }

  const handleAssigneeChange = async (agentId: string) => {
    const newAgent = agents.find(a => a.id === agentId)
    if (!newAgent) return

    try {
      setTicket(prev => ({
        ...prev,
        assigned_agent: {
          id: newAgent.id,
          name: newAgent.name,
          email: newAgent.email
        },
        history: [
          {
            id: Date.now().toString(),
            action: 'update',
            actor: 'You',
            timestamp: new Date().toISOString(),
            details: `Assigned to "${newAgent.name || newAgent.email}"`
          },
          ...prev.history
        ]
      }))
      await onAssigneeChange(agentId)
    } catch (error) {
      setTicket(prev => ({
        ...prev,
        assigned_agent: prev.assigned_agent
      }))
      toast.error("Failed to update assignee")
    }
  }

  const handleTagsChange = async (newTags: string[]) => {
    try {
      setTicket(prev => ({
        ...prev,
        tags: newTags,
        history: [
          {
            id: Date.now().toString(),
            action: 'update',
            actor: 'You',
            timestamp: new Date().toISOString(),
            details: `Updated tags`
          },
          ...prev.history
        ]
      }))
      await onTagsChange(newTags)
    } catch (error) {
      setTicket(prev => ({
        ...prev,
        tags: prev.tags
      }))
      toast.error("Failed to update tags")
    }
  }

  const addTag = async () => {
    if (!newTag.trim()) return
    const updatedTags = [...ticket.tags, newTag.trim()]
    await handleTagsChange(updatedTags)
    setNewTag("")
  }

  const removeTag = async (tagToRemove: string) => {
    const updatedTags = ticket.tags.filter(tag => tag !== tagToRemove)
    await handleTagsChange(updatedTags)
  }

  const paginatedHistory = ticket.history?.slice(
    (historyPage - 1) * ITEMS_PER_PAGE,
    historyPage * ITEMS_PER_PAGE
  )

  const paginatedResponses = ticket.responses?.slice(
    (responsesPage - 1) * ITEMS_PER_PAGE,
    responsesPage * ITEMS_PER_PAGE
  )

  const statusColors = {
    new: 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300',
    open: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300',
    resolved: 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 hover:border-purple-300',
    closed: 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
  } as const

  const priorityColors = {
    low: 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300',
    medium: 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300',
    high: 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 hover:border-orange-300',
    urgent: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300'
  } as const

  const handleResponseAdded = () => {
    // Force a refresh of the response list by changing its key
    setResponseKey(prev => prev + 1)
  }

  const renderHistoryEntry = (entry: HistoryEntry) => {
    return (
      <div key={entry.id} className="flex items-start space-x-2 py-2">
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            {entry.actor} {entry.details}
          </p>
          <p className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(entry.timestamp))} ago
          </p>
        </div>
      </div>
    )
  }

  const renderResponse = (response: Response) => {
    const authorName = response.author?.user_metadata?.name || response.author?.email || 'System'
    return (
      <div key={response.id} className="flex flex-col space-y-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{authorName}</span>
            {response.is_internal && (
              <Badge variant="secondary">Internal</Badge>
            )}
            {response.type === 'ai' && (
              <Badge variant="secondary">AI</Badge>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(response.created_at))} ago
          </span>
        </div>
        <p className="text-sm text-gray-600">{response.content}</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Ticket Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs px-1.5 py-0 border-dashed text-gray-500 bg-gray-50">
                #{ticket.id.slice(0, 8)}
              </Badge>
              <Badge className={`${priorityColors[ticket.priority]} shadow-sm font-medium`}>
                {ticket.priority}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{ticket.title}</h1>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                Created {formatDistanceToNow(new Date(ticket.created_at))} ago
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1.5 text-gray-600">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span className={ticket.assigned_agent ? "" : "italic text-gray-400"}>
                  {ticket.assigned_agent?.name || ticket.assigned_agent?.email || 'Unassigned'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="grid grid-cols-4 gap-4">
          {/* Status Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={`justify-start h-auto py-2.5 w-full transition-all ${
                  ticket.status === 'new' ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50' :
                  ticket.status === 'open' ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50' :
                  ticket.status === 'pending' ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50' :
                  ticket.status === 'resolved' ? 'border-purple-200 bg-purple-50/50 hover:bg-purple-50' :
                  'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-start gap-1 text-left">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Status</span>
                  <div className="flex items-center gap-2 w-full">
                    <Badge className={`${statusColors[ticket.status]} shadow-sm font-medium`}>
                      {ticket.status}
                    </Badge>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-gray-500">Update Status</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              {(['new', 'open', 'pending', 'resolved', 'closed'] as const).map(status => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className="gap-2 cursor-pointer hover:bg-gray-50"
                >
                  <Badge className={`${statusColors[status]} shadow-sm font-medium`}>
                    {status}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={`justify-start h-auto py-2.5 w-full transition-all ${
                  ticket.priority === 'urgent' ? 'border-rose-200 bg-rose-50/50 hover:bg-rose-50' :
                  ticket.priority === 'high' ? 'border-orange-200 bg-orange-50/50 hover:bg-orange-50' :
                  ticket.priority === 'medium' ? 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50' :
                  'border-blue-200 bg-blue-50/50 hover:bg-blue-50'
                }`}
              >
                <div className="flex flex-col items-start gap-1 text-left">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Priority</span>
                  <div className="flex items-center gap-2 w-full">
                    <Badge className={`${priorityColors[ticket.priority]} shadow-sm font-medium`}>
                      {ticket.priority}
                    </Badge>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-gray-500">Set Priority</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                <DropdownMenuItem
                  key={priority}
                  onClick={() => handlePriorityChange(priority)}
                  className="gap-2 cursor-pointer hover:bg-gray-50"
                >
                  <Badge className={`${priorityColors[priority]} shadow-sm font-medium`}>
                    {priority}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Team Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={`justify-start h-auto py-2.5 w-full transition-all ${
                  ticket.team ? 'border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50' : 'bg-gray-50/50 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-start gap-1 text-left">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Team</span>
                  <div className="flex items-center gap-2 w-full">
                    <span className={`font-medium truncate ${ticket.team ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                      {ticket.team?.name || 'Unassigned'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-gray-500">Assign Team</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              {teams.map(team => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => handleTeamChange(team.id)}
                  className="cursor-pointer hover:bg-gray-50 text-gray-700"
                >
                  {team.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assigned Agent Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={`justify-start h-auto py-2.5 w-full transition-all ${
                  ticket.assigned_agent ? 'border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50' : 'bg-gray-50/50 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-start gap-1 text-left">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Assigned To</span>
                  <div className="flex items-center gap-2 w-full">
                    <span className={`font-medium truncate ${ticket.assigned_agent ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                      {ticket.assigned_agent?.name || ticket.assigned_agent?.email || 'Unassigned'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-gray-500">Assign Agent</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              {agents.map(agent => (
                <DropdownMenuItem
                  key={agent.id}
                  onClick={() => handleAssigneeChange(agent.id)}
                  className="cursor-pointer hover:bg-gray-50 text-gray-700"
                >
                  {agent.name || agent.email}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Description Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-sm font-medium text-gray-700">Description</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-400 hover:text-gray-700">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="text-sm pt-4 text-gray-600">
              {ticket.description}
            </CardContent>
          </Card>

          {/* Add Response Section */}
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="py-3 border-b border-indigo-100 bg-indigo-50/50">
              <CardTitle className="text-sm font-medium text-indigo-900">Add Response</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <TicketResponseComposer
                key={responseKey}
                ticketId={ticket.id}
                onResponseAdded={handleResponseAdded}
              />
            </CardContent>
          </Card>

          {/* Previous Responses Section */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                Previous Responses
              </CardTitle>
              {totalResponsePages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-gray-400 hover:text-gray-700"
                    onClick={() => setResponsesPage(prev => Math.max(1, prev - 1))}
                    disabled={responsesPage === 1}
                  >
                    <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                  </Button>
                  <span className="text-xs text-gray-500 font-medium">
                    {responsesPage} / {totalResponsePages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-gray-400 hover:text-gray-700"
                    onClick={() => setResponsesPage(prev => Math.min(totalResponsePages, prev + 1))}
                    disabled={responsesPage === totalResponsePages}
                  >
                    <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {paginatedResponses?.map(response => renderResponse(response))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Tags Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="py-3 border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-gray-400" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {ticket.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer transition-colors group"
                      onClick={() => removeTag(tag)}
                    >
                      {tag}
                      <span className="ml-1 text-gray-400 group-hover:text-gray-600 transition-colors">×</span>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Add tag..."
                    className="h-8 text-sm"
                  />
                  <Button 
                    onClick={addTag} 
                    size="sm" 
                    variant="secondary"
                    className="h-8 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <History className="h-3.5 w-3.5 text-gray-400" />
                History
              </CardTitle>
              {totalHistoryPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-gray-400 hover:text-gray-700"
                    onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                    disabled={historyPage === 1}
                  >
                    <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                  </Button>
                  <span className="text-xs text-gray-500 font-medium">
                    {historyPage} / {totalHistoryPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-gray-400 hover:text-gray-700"
                    onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                    disabled={historyPage === totalHistoryPages}
                  >
                    <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {paginatedHistory?.map(entry => renderHistoryEntry(entry))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 