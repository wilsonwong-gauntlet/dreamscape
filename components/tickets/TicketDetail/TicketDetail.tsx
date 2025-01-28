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
import { 
  MoreHorizontal, Clock, User, Tag, History, ChevronDown, 
  ChevronUp, MessageSquare, Users, Phone, Mail, Globe,
  AlertCircle, CheckCircle2, Timer, ArrowUpCircle, XCircle,
  Calendar, ArrowRight, Inbox, RefreshCw
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import type { Ticket } from "@/types/database"
import TicketResponseList from "./TicketResponseList"
import TicketResponseComposer from "./TicketResponseComposer"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { TicketActions } from "@/components/tickets/TicketActions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  updated_at: string
  source: string
  customer_id?: string
  customer?: {
    id: string
    company: string | null
    user: {
      id: string
      email: string
      user_metadata: {
        full_name?: string
        name?: string
      }
    }
  }
  team?: {
    id: string
    name: string
  }
  assigned_agent?: {
    id: string
    role: string
    team_id: string | null
    email: string
    name: string
    user: {
      email: string
    }
  }
  tags: string[]
  history: HistoryEntry[]
  responses: Response[]
}

interface CustomerDetails {
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
  };
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
    role: string
  }[]
  currentUserId: string
  customerDetails?: CustomerDetails | null
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
  customerDetails,
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
    console.log('Initial Ticket:', initialTicket)
    console.log('Current Ticket State:', ticket)
    console.log('Teams:', teams)
    console.log('Agents:', agents)
  }, [initialTicket, ticket, teams, agents])

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
    if (!agentId) {
      setTicket(prev => ({
        ...prev,
        assigned_agent: undefined
      }))
      await onAssigneeChange(null)
      return
    }

    const selectedAgent = agents.find(a => a.id === agentId)
    if (!selectedAgent) return

    setTicket(prev => ({
      ...prev,
      assigned_agent: {
        id: selectedAgent.id,
        role: selectedAgent.role || 'agent',
        team_id: selectedAgent.team_id,
        email: selectedAgent.email,
        name: selectedAgent.name || selectedAgent.email,
        user: {
          email: selectedAgent.email
        }
      }
    }))
    await onAssigneeChange(agentId)
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

  const statusIcons = {
    new: <Inbox className="h-4 w-4" />,
    open: <ArrowUpCircle className="h-4 w-4" />,
    pending: <Timer className="h-4 w-4" />,
    resolved: <CheckCircle2 className="h-4 w-4" />,
    closed: <XCircle className="h-4 w-4" />
  }

  const sourceIcons = {
    email: <Mail className="h-4 w-4" />,
    phone: <Phone className="h-4 w-4" />,
    web: <Globe className="h-4 w-4" />,
    chat: <MessageSquare className="h-4 w-4" />
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Sidebar - Fixed Width */}
      <div className="w-80 border-r border-gray-200 bg-gray-50/30 flex flex-col overflow-hidden">
        {/* Ticket Info Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <Badge 
              variant="outline" 
              className="font-mono text-xs px-2 py-0.5 border-dashed text-gray-500 bg-gray-50/50"
            >
              #{ticket.id.slice(0, 8)}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh ticket</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <h2 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2">
            {ticket.title}
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {sourceIcons[ticket.source as keyof typeof sourceIcons]}
            <span className="capitalize">{ticket.source}</span>
            <span className="text-gray-300">•</span>
            <time dateTime={ticket.created_at}>
              {formatDistanceToNow(new Date(ticket.created_at))} ago
            </time>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-2">
            {/* Status Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "w-full justify-between h-9",
                    statusColors[ticket.status]
                  )}
                >
                  <div className="flex items-center gap-2">
                    {statusIcons[ticket.status]}
                    <span className="capitalize">{ticket.status}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['new', 'open', 'pending', 'resolved', 'closed'] as const).map(status => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className="flex items-center gap-2"
                  >
                    {statusIcons[status]}
                    <span className="capitalize">{status}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Priority Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "w-full justify-between h-9",
                    priorityColors[ticket.priority]
                  )}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="capitalize">{ticket.priority}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Set Priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                  <DropdownMenuItem
                    key={priority}
                    onClick={() => handlePriorityChange(priority)}
                    className="flex items-center gap-2"
                  >
                    <AlertCircle className={cn(
                      "h-4 w-4",
                      priority === 'urgent' && "text-red-500",
                      priority === 'high' && "text-orange-500",
                      priority === 'medium' && "text-yellow-500",
                      priority === 'low' && "text-blue-500"
                    )} />
                    <span className="capitalize">{priority}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Assignment Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-9 bg-white"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="truncate">
                      {ticket.assigned_agent?.name || 'Unassigned'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel>Assign Ticket</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleAssigneeChange(null)}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Unassigned</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {teams.map(team => {
                  const teamAgents = agents.filter(a => a.team_id === team.id)
                  if (teamAgents.length === 0) return null
                  
                  return (
                    <DropdownMenuSub key={team.id}>
                      <DropdownMenuSubTrigger className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{team.name}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-72">
                        {teamAgents.map(agent => (
                          <DropdownMenuItem
                            key={agent.id}
                            onClick={() => handleAssigneeChange(agent.id)}
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                              {(agent.name || agent.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm truncate">
                                {agent.name || agent.email}
                              </span>
                              {agent.name && (
                                <span className="text-xs text-gray-500 truncate">
                                  {agent.email}
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Customer Details
          </h3>
          <div className="space-y-3">
            {ticket.customer ? (
              <>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {ticket.customer.user?.user_metadata?.full_name || 
                     ticket.customer.user?.user_metadata?.name || 
                     ticket.customer.user?.email || 
                     'Loading...'}
                  </div>
                  {ticket.customer.user?.email && (
                    <div className="text-sm text-gray-500">
                      {ticket.customer.user.email}
                    </div>
                  )}
                </div>
                {ticket.customer.company && (
                  <div className="text-sm text-gray-600">
                    {ticket.customer.company}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No customer information available
              </div>
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Tags
          </h3>
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
                  <span className="ml-1 text-gray-400 group-hover:text-gray-600">×</span>
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
                className="h-8 px-3"
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
            Activity
            {totalHistoryPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                  disabled={historyPage === 1}
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </Button>
                <span className="text-xs">
                  {historyPage}/{totalHistoryPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                  disabled={historyPage === totalHistoryPages}
                >
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </Button>
              </div>
            )}
          </h3>
          <div className="space-y-4">
            {paginatedHistory?.map(entry => (
              <div key={entry.id} className="flex gap-3 text-sm">
                <div className="flex-none pt-0.5">
                  <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <History className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {entry.actor}
                  </div>
                  <div className="text-gray-500">
                    {entry.details}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(entry.timestamp))} ago
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area - Fluid Width */}
      <div className="flex-1 overflow-y-auto bg-gray-50/30">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Description Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="py-4 px-6">
              <CardTitle className="text-lg font-medium">Description</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Original ticket description
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-4 text-sm text-gray-600 whitespace-pre-wrap">
              {ticket.description}
            </CardContent>
          </Card>

          {/* Response Composer */}
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="py-4 px-6 bg-indigo-50/50 border-b border-indigo-100">
              <CardTitle className="text-lg font-medium text-indigo-900">
                Add Response
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <TicketResponseComposer
                key={responseKey}
                ticketId={ticket.id}
                ticket={ticket}
                onResponseAdded={handleResponseAdded}
              />
            </CardContent>
          </Card>

          {/* Previous Responses */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium">
                  Conversation History
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  Previous responses and internal notes
                </CardDescription>
              </div>
              {totalResponsePages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8"
                    onClick={() => setResponsesPage(prev => Math.max(1, prev - 1))}
                    disabled={responsesPage === 1}
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                  <span className="text-sm text-gray-500">
                    {responsesPage}/{totalResponsePages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8"
                    onClick={() => setResponsesPage(prev => Math.min(totalResponsePages, prev + 1))}
                    disabled={responsesPage === totalResponsePages}
                  >
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="px-6 divide-y divide-gray-100">
              {paginatedResponses?.map(response => (
                <div key={response.id} className="py-4 first:pt-2 last:pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                        {(response.author?.user_metadata?.name || response.author?.email || 'S').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {response.author?.user_metadata?.name || response.author?.email || 'System'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(response.created_at))} ago
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {response.is_internal && (
                        <Badge variant="secondary" className="bg-gray-100">
                          Internal
                        </Badge>
                      )}
                      {response.type === 'ai' && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                          AI Generated
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 pl-10">
                    {response.content}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 