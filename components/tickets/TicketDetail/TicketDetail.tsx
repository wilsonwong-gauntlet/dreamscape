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
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { MoreHorizontal, Clock, User, Tag, History } from "lucide-react"
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
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            <Separator orientation="vertical" className="h-4" />
            <User className="h-4 w-4" />
            {ticket.customer_id}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ticket Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusChange("open")}>
              Mark as Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange("pending")}>
              Mark as Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange("resolved")}>
              Mark as Resolved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange("closed")}>
              Mark as Closed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Manage ticket status and assignment</CardDescription>
        </CardHeader>
        <CardContent>
          <TicketActions
            ticket={ticket}
            teams={teams}
            agents={agents}
            currentUserId={currentUserId}
            onStatusChange={onStatusChange}
            onPriorityChange={onPriorityChange}
            onTeamChange={onTeamChange}
            onAssigneeChange={onAssigneeChange}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>Manage ticket tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ticket.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add new tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              />
              <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                Add Tag
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
          <CardDescription>
            Submitted on {format(new Date(ticket.created_at), "PPP")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{ticket.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Ticket activity log</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ticket.history.map((event) => {
              // Validate the timestamp
              const timestamp = new Date(event.timestamp)
              const isValidDate = !isNaN(timestamp.getTime())

              return (
                <div key={event.id} className="flex items-start gap-3 text-sm">
                  <History className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{event.actor}</span>{" "}
                      {event.action}
                    </p>
                    {event.details && (
                      <p className="text-muted-foreground">{event.details}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {isValidDate 
                        ? formatDistanceToNow(timestamp, { addSuffix: true })
                        : 'Invalid date'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responses</CardTitle>
          <CardDescription>Communication history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TicketResponseList 
            key={responseKey} 
            ticketId={ticket.id} 
            responses={ticket.responses} 
          />
          <TicketResponseComposer 
            ticketId={ticket.id} 
            onResponseAdded={handleResponseAdded}
          />
        </CardContent>
      </Card>
    </div>
  )
} 