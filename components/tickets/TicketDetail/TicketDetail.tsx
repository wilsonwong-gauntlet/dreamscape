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
import { MoreHorizontal, Clock, User, Tag, History, ChevronDown, ChevronUp, MessageSquare, Users } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import type { Ticket } from "@/types/database"
import TicketResponseList from "./TicketResponseList"
import TicketResponseComposer from "./TicketResponseComposer"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { TicketActions } from "@/components/tickets/TicketActions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
  onTeamChange: (teamId: string | null) => Promise<void>
  onAssigneeChange: (agentId: string | null) => Promise<void>
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
  
  // Initialize to first page since newest items are at the start
  const [historyPage, setHistoryPage] = useState(1)
  const [responsesPage, setResponsesPage] = useState(1)

  useEffect(() => {
    setTicket(prev => ({
      ...initialTicket,
      // Sort history and responses in reverse chronological order
      history: initialTicket.history.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
      responses: initialTicket.responses.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }))
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
      setHistoryPage(1)
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
      setHistoryPage(1)
      await onPriorityChange(newPriority)
    } catch (error) {
      setTicket(prev => ({
        ...prev,
        priority: prev.priority
      }))
      toast.error("Failed to update priority")
    }
  }

  const handleTeamChange = async (teamId: string | null) => {
    try {
      // If teamId is null, we're unassigning
      if (teamId === null) {
        setTicket(prev => ({
          ...prev,
          team: undefined,
          history: [
            {
              id: Date.now().toString(),
              action: 'update',
              actor: 'You',
              timestamp: new Date().toISOString(),
              details: prev.team ? `Unassigned from team "${prev.team.name}"` : 'Removed team assignment'
            },
            ...prev.history
          ]
        }))
        setHistoryPage(1)
        await onTeamChange(null)
        return
      }

      const newTeam = teams.find(t => t.id === teamId)
      if (!newTeam) return

      setTicket(prev => ({
        ...prev,
        team: newTeam,
        history: [
          {
            id: Date.now().toString(),
            action: 'update',
            actor: 'You',
            timestamp: new Date().toISOString(),
            details: prev.team 
              ? `Reassigned from team "${prev.team.name}" to "${newTeam.name}"`
              : `Assigned to team "${newTeam.name}"`
          },
          ...prev.history
        ]
      }))
      setHistoryPage(1)
      await onTeamChange(teamId)
    } catch (error) {
      setTicket(prev => ({
        ...prev,
        team: prev.team
      }))
      toast.error("Failed to update team")
    }
  }

  const handleAssigneeChange = async (agentId: string | null) => {
    try {
      // If agentId is null, we're unassigning
      if (agentId === null) {
        setTicket(prev => ({
          ...prev,
          assigned_agent: undefined,
          history: [
            {
              id: Date.now().toString(),
              action: 'update',
              actor: 'You',
              timestamp: new Date().toISOString(),
              details: prev.assigned_agent 
                ? `Unassigned from agent "${prev.assigned_agent.name || prev.assigned_agent.email}"`
                : 'Removed agent assignment'
            },
            ...prev.history
          ]
        }))
        setHistoryPage(1)
        await onAssigneeChange(null)
        return
      }

      const newAgent = agents.find(a => a.id === agentId)
      if (!newAgent) return

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
            details: prev.assigned_agent
              ? `Reassigned from "${prev.assigned_agent.name || prev.assigned_agent.email}" to "${newAgent.name || newAgent.email}"`
              : `Assigned to agent "${newAgent.name || newAgent.email}"`
          },
          ...prev.history
        ]
      }))
      setHistoryPage(1)
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
      setHistoryPage(1)
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
    // Reset to first page to show new response
    setResponsesPage(1)
    // Update response key to force composer refresh
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
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="font-mono text-xs px-2 py-0.5 border-dashed text-gray-500 bg-gray-50/50"
              >
                #{ticket.id.slice(0, 8)}
              </Badge>
              <Badge 
                className={cn(
                  "shadow-sm font-medium px-2.5 py-0.5",
                  priorityColors[ticket.priority]
                )}
              >
                {ticket.priority}
              </Badge>
              <Badge 
                className={cn(
                  "shadow-sm font-medium px-2.5 py-0.5",
                  statusColors[ticket.status]
                )}
              >
                {ticket.status}
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">{ticket.title}</h1>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  Created {formatDistanceToNow(new Date(ticket.created_at))} ago
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  <span className={ticket.assigned_agent ? "" : "italic text-gray-400"}>
                    {ticket.assigned_agent?.name || ticket.assigned_agent?.email || 'Unassigned'}
                  </span>
                </div>
                {ticket.team && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {ticket.team.name}
                  </div>
                )}
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
                className={cn(
                  "justify-start h-auto py-2.5 w-full transition-all",
                  ticket.status === 'new' && "border-blue-200 bg-blue-50/50 hover:bg-blue-50",
                  ticket.status === 'open' && "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50",
                  ticket.status === 'pending' && "border-amber-200 bg-amber-50/50 hover:bg-amber-50",
                  ticket.status === 'resolved' && "border-purple-200 bg-purple-50/50 hover:bg-purple-50",
                  ticket.status === 'closed' && "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                )}
              >
                <div className="flex flex-col items-start gap-1 text-left">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Status</span>
                  <div className="flex items-center gap-2 w-full">
                    <Badge className={cn("shadow-sm font-medium", statusColors[ticket.status])}>
                      {ticket.status}
                    </Badge>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-gray-500">Update Status</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              {(['new', 'open', 'pending', 'resolved', 'closed'] as const).map(status => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <Badge className={cn("shadow-sm font-medium min-w-[80px] justify-center", statusColors[status])}>
                    {status}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {status === 'new' ? 'Newly created ticket' :
                     status === 'open' ? 'Actively being worked on' :
                     status === 'pending' ? 'Waiting on customer' :
                     status === 'resolved' ? 'Solution provided' :
                     'Ticket completed'}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "justify-start h-auto py-2.5 w-full transition-all",
                  ticket.priority === 'urgent' && "border-rose-200 bg-rose-50/50 hover:bg-rose-50",
                  ticket.priority === 'high' && "border-orange-200 bg-orange-50/50 hover:bg-orange-50",
                  ticket.priority === 'medium' && "border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50",
                  ticket.priority === 'low' && "border-blue-200 bg-blue-50/50 hover:bg-blue-50"
                )}
              >
                <div className="flex flex-col items-start gap-1 text-left">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Priority</span>
                  <div className="flex items-center gap-2 w-full">
                    <Badge className={cn("shadow-sm font-medium", priorityColors[ticket.priority])}>
                      {ticket.priority}
                    </Badge>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-gray-500">Set Priority</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                <DropdownMenuItem
                  key={priority}
                  onClick={() => handlePriorityChange(priority)}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <Badge className={cn("shadow-sm font-medium min-w-[80px] justify-center", priorityColors[priority])}>
                    {priority}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {priority === 'low' ? 'Non-urgent issue' :
                     priority === 'medium' ? 'Normal priority' :
                     priority === 'high' ? 'Important issue' :
                     'Critical issue'}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Team Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "justify-start h-auto py-2.5 w-full transition-all",
                  ticket.team ? "border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50" : "bg-gray-50/50 hover:bg-gray-50"
                )}
              >
                <div className="flex flex-col items-start gap-1 text-left">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Team</span>
                  <div className="flex items-center gap-2 w-full">
                    <span className={cn(
                      "font-medium truncate",
                      ticket.team ? "text-gray-700" : "text-gray-400 italic"
                    )}>
                      {ticket.team?.name || 'Unassigned'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-gray-500">Assign Team</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem
                onClick={() => handleTeamChange(null)}
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 italic">Unassigned</span>
                  <span className="text-xs text-gray-400">Remove team assignment</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
              {teams.map(team => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => handleTeamChange(team.id)}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700">{team.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assigned Agent Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "justify-start h-auto py-2.5 w-full transition-all",
                  ticket.assigned_agent ? "border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50" : "bg-gray-50/50 hover:bg-gray-50"
                )}
              >
                <div className="flex flex-col items-start gap-1 text-left">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Assigned To</span>
                  <div className="flex items-center gap-2 w-full">
                    <span className={cn(
                      "font-medium truncate",
                      ticket.assigned_agent ? "text-gray-700" : "text-gray-400 italic"
                    )}>
                      {ticket.assigned_agent?.name || ticket.assigned_agent?.email || 'Unassigned'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-gray-500">Assign Agent</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem
                onClick={() => handleAssigneeChange(null)}
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 italic">Unassigned</span>
                  <span className="text-xs text-gray-400">Remove agent assignment</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
              {teams.map(team => (
                <div key={team.id}>
                  <DropdownMenuLabel className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-gray-400 bg-gray-50/80">
                    {team.name}
                  </DropdownMenuLabel>
                  {agents
                    .filter(agent => agent.team_id === team.id)
                    .map(agent => (
                      <DropdownMenuItem
                        key={agent.id}
                        onClick={() => handleAssigneeChange(agent.id)}
                        className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                          {(agent.name || agent.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          {agent.name && (
                            <span className="text-sm text-gray-700 truncate">{agent.name}</span>
                          )}
                          <span className="text-xs text-gray-400 truncate">{agent.email}</span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  }
                </div>
              ))}
              {agents.filter(agent => !agent.team_id).length > 0 && (
                <div>
                  <DropdownMenuLabel className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-gray-400 bg-gray-50/80">
                    Unassigned Agents
                  </DropdownMenuLabel>
                  {agents
                    .filter(agent => !agent.team_id)
                    .map(agent => (
                      <DropdownMenuItem
                        key={agent.id}
                        onClick={() => handleAssigneeChange(agent.id)}
                        className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-600 font-medium">
                          {(agent.name || agent.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          {agent.name && (
                            <span className="text-sm text-gray-700 truncate">{agent.name}</span>
                          )}
                          <span className="text-xs text-gray-400 truncate">{agent.email}</span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  }
                </div>
              )}
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