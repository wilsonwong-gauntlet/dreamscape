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
import { MoreHorizontal, Clock, User } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import type { Ticket } from "@/types/database"
import TicketResponseList from "./TicketResponseList"
import TicketResponseComposer from "./TicketResponseComposer"

interface TicketDetailProps {
  ticket: Ticket
  onStatusChange: (status: string) => void
  onAssigneeChange: (agentId: string) => void
}

export default function TicketDetail({
  ticket,
  onStatusChange,
  onAssigneeChange,
}: TicketDetailProps) {
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

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Current ticket status</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge
              variant="secondary"
              className={statusColors[ticket.status as keyof typeof statusColors]}
            >
              {ticket.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority</CardTitle>
            <CardDescription>Ticket priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge
              className={
                priorityColors[ticket.priority as keyof typeof priorityColors]
              }
            >
              {ticket.priority}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
            <CardDescription>Assigned team member</CardDescription>
          </CardHeader>
          <CardContent>
            {ticket.assigned_agent_id ? (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{ticket.assigned_agent_id}</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssigneeChange("current-user-id")}
              >
                Assign to me
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

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

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Responses</h2>
        <TicketResponseList ticketId={ticket.id} />
        <TicketResponseComposer ticketId={ticket.id} />
      </div>
    </div>
  )
} 