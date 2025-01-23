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

  const statusColors: Record<TicketStatus, string> = {
    new: "bg-blue-500 text-white",
    open: "bg-green-500 text-white",
    pending: "bg-yellow-500 text-white",
    resolved: "bg-purple-500 text-white",
    closed: "bg-gray-500 text-white",
  }

  const priorityColors: Record<TicketPriority, string> = {
    low: "bg-gray-500 text-white",
    medium: "bg-yellow-500 text-white",
    high: "bg-orange-500 text-white",
    urgent: "bg-red-500 text-white",
  }

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
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Status</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Badge className={statusColors[ticket.status]} variant="secondary">
                        {ticket.status}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(['new', 'open', 'pending', 'resolved', 'closed'] as const).map(status => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleStatusChange(status)}
                      >
                        <Badge className={statusColors[status]} variant="secondary">
                          {status}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <h3 className="font-medium mb-2">Priority</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Badge className={priorityColors[ticket.priority]} variant="secondary">
                        {ticket.priority}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Set Priority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                      <DropdownMenuItem
                        key={priority}
                        onClick={() => handlePriorityChange(priority)}
                      >
                        <Badge className={priorityColors[priority]} variant="secondary">
                          {priority}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <h3 className="font-medium mb-2">Team</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {ticket.team?.name || 'Unassigned'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Assign Team</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {teams.map(team => (
                      <DropdownMenuItem
                        key={team.id}
                        onClick={() => handleTeamChange(team.id)}
                      >
                        {team.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <h3 className="font-medium mb-2">Assigned Agent</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {ticket.assigned_agent?.name || ticket.assigned_agent?.email || 'Unassigned'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Assign Agent</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {agents.map(agent => (
                      <DropdownMenuItem
                        key={agent.id}
                        onClick={() => handleAssigneeChange(agent.id)}
                      >
                        {agent.name || agent.email}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="col-span-2">
                <h3 className="font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {ticket.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      placeholder="Add tag..."
                      className="w-32"
                    />
                    <Button onClick={addTag} size="sm">
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              History
            </CardTitle>
            {totalHistoryPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                  disabled={historyPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {historyPage} of {totalHistoryPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                  disabled={historyPage === totalHistoryPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paginatedHistory?.map(entry => renderHistoryEntry(entry))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Previous Responses
            </CardTitle>
            {totalResponsePages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResponsesPage(prev => Math.max(1, prev - 1))}
                  disabled={responsesPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {responsesPage} of {totalResponsePages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResponsesPage(prev => Math.min(totalResponsePages, prev + 1))}
                  disabled={responsesPage === totalResponsePages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paginatedResponses?.map(response => renderResponse(response))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Response</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketResponseComposer
              key={responseKey}
              ticketId={ticket.id}
              onResponseAdded={handleResponseAdded}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 