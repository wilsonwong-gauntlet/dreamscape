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
import { useState } from "react"
import { TicketActions } from "@/components/tickets/TicketActions"

interface Response {
  id: string
  ticket_id: string
  author_id: string
  content: string
  type: 'human' | 'ai'
  is_internal: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  author?: {
    id: string
    email: string
    user_metadata: {
      name?: string
    }
  }
}

interface TicketDetailProps {
  ticket: Ticket & {
    tags: string[]
    history: {
      id: string
      action: string
      actor: string
      timestamp: string
      details?: string
    }[]
    responses: Response[]
  }
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
  onStatusChange: (status: string) => Promise<void>
  onPriorityChange: (priority: string) => Promise<void>
  onTeamChange: (teamId: string) => Promise<void>
  onAssigneeChange: (agentId: string) => Promise<void>
  onTagsChange: (tags: string[]) => Promise<void>
}

const ITEMS_PER_PAGE = 5

export default function TicketDetail({
  ticket,
  teams,
  agents,
  currentUserId,
  onStatusChange,
  onPriorityChange,
  onTeamChange,
  onAssigneeChange,
  onTagsChange,
}: TicketDetailProps) {
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
  
  const paginatedHistory = ticket.history?.slice(
    (historyPage - 1) * ITEMS_PER_PAGE,
    historyPage * ITEMS_PER_PAGE
  )

  const paginatedResponses = ticket.responses?.slice(
    (responsesPage - 1) * ITEMS_PER_PAGE,
    responsesPage * ITEMS_PER_PAGE
  )

  const statusColors = {
    new: "bg-blue-500",
    open: "bg-yellow-500",
    pending: "bg-purple-500",
    resolved: "bg-green-500",
    closed: "bg-gray-500",
  }

  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
    urgent: "bg-red-500 text-white",
  }

  const handleAddTag = () => {
    if (newTag.trim() && !ticket.tags.includes(newTag.trim())) {
      const updatedTags = [...ticket.tags, newTag.trim()]
      onTagsChange(updatedTags)
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = ticket.tags.filter(tag => tag !== tagToRemove)
    onTagsChange(updatedTags)
  }

  const handleResponseAdded = () => {
    // Force a refresh of the response list by changing its key
    setResponseKey(prev => prev + 1)
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-6">
      {/* Header Section */}
      <div className="flex items-start justify-between space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{ticket.title}</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
          </div>
        </div>
        <Button variant="outline" onClick={() => window.history.back()} className="shrink-0">
          Back to Tickets
        </Button>
      </div>

      {/* Actions Section */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            {/* Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[120px]">
                  <Badge className={`${statusColors[ticket.status]} px-3 py-1`} variant="secondary">
                    {ticket.status}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['new', 'open', 'pending', 'resolved', 'closed'] as const).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onStatusChange(status)}
                  >
                    <Badge className={statusColors[status]} variant="secondary">
                      {status}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Priority Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[120px]">
                  <Badge className={`${priorityColors[ticket.priority]} px-3 py-1`} variant="secondary">
                    {ticket.priority}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                  <DropdownMenuItem
                    key={priority}
                    onClick={() => onPriorityChange(priority)}
                  >
                    <Badge className={priorityColors[priority]} variant="secondary">
                      {priority}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Team Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[160px]">
                  <User className="h-4 w-4 mr-2" />
                  {ticket.team?.name || 'Assign Team'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Assign Team</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {teams.map((team) => (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={() => onTeamChange(team.id)}
                  >
                    {team.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Agent Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[160px]">
                  <User className="h-4 w-4 mr-2" />
                  {ticket.assigned_agent?.name || 'Assign Agent'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Assign Agent</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {agents.map((agent) => (
                  <DropdownMenuItem
                    key={agent.id}
                    onClick={() => onAssigneeChange(agent.id)}
                  >
                    {agent.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Description Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Description</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
        </CardContent>
      </Card>

      {/* History Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <CardTitle className="text-lg font-semibold">History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {paginatedHistory?.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 text-sm pb-3 last:pb-0">
                <div className="text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{entry.actor}</span>
                  <span className="text-muted-foreground"> {entry.details}</span>
                </div>
              </div>
            ))}
            {totalHistoryPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {historyPage} of {totalHistoryPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                  disabled={historyPage === totalHistoryPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Previous Responses Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <CardTitle className="text-lg font-semibold">Previous Responses</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {paginatedResponses?.map((response) => (
              <div key={response.id} className="flex items-start gap-4 text-sm pb-3 last:pb-0">
                <div className="text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(response.created_at), { addSuffix: true })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      {response.author?.user_metadata?.name || response.author?.email || 'System'}
                    </span>
                    {response.type === 'ai' && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        AI Response
                      </Badge>
                    )}
                    {response.is_internal && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        Internal
                      </Badge>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{response.content}</p>
                </div>
              </div>
            ))}
            {totalResponsePages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResponsesPage(p => Math.max(1, p - 1))}
                  disabled={responsesPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {responsesPage} of {totalResponsePages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResponsesPage(p => Math.min(totalResponsePages, p + 1))}
                  disabled={responsesPage === totalResponsePages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Response Composer - Always visible */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Add Response</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketResponseComposer 
            ticketId={ticket.id} 
            onResponseAdded={handleResponseAdded}
          />
        </CardContent>
      </Card>
    </div>
  )
} 