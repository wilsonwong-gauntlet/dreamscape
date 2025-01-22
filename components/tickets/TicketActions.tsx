'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

interface Team {
  id: string
  name: string
}

interface Agent {
  id: string
  name?: string
  email: string
  team_id: string | null
}

interface Ticket {
  id: string
  status: TicketStatus
  priority: TicketPriority
  team_id: string | null
  assigned_agent_id: string | null
}

interface TicketActionsProps {
  ticket: Ticket
  teams?: Team[]
  agents?: Agent[]
  currentUserId?: string
  onStatusChange: (status: TicketStatus) => Promise<void>
  onPriorityChange?: (priority: TicketPriority) => Promise<void>
  onTeamChange?: (teamId: string) => Promise<void>
  onAssigneeChange: (agentId: string) => Promise<void>
}

export function TicketActions({ 
  ticket, 
  teams = [], 
  agents = [], 
  currentUserId,
  onStatusChange,
  onPriorityChange,
  onTeamChange,
  onAssigneeChange,
}: TicketActionsProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateType, setUpdateType] = useState<'status' | 'priority' | 'team' | 'agent' | null>(null)

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      setIsUpdating(true)
      setUpdateType('status')
      await onStatusChange(newStatus)
      toast.success('Ticket status updated')
      router.refresh()
    } catch (error) {
      console.error('Error updating ticket status:', error)
      toast.error('Failed to update ticket status')
    } finally {
      setIsUpdating(false)
      setUpdateType(null)
    }
  }

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!onPriorityChange) return

    try {
      setIsUpdating(true)
      setUpdateType('priority')
      await onPriorityChange(newPriority)
      toast.success('Ticket priority updated')
      router.refresh()
    } catch (error) {
      console.error('Error updating ticket priority:', error)
      toast.error('Failed to update ticket priority')
    } finally {
      setIsUpdating(false)
      setUpdateType(null)
    }
  }

  const handleTeamAssignment = async (teamId: string) => {
    if (!onTeamChange) return

    try {
      setIsUpdating(true)
      setUpdateType('team')
      await onTeamChange(teamId)
      toast.success('Ticket assigned to team')
      router.refresh()
    } catch (error) {
      console.error('Error updating ticket team:', error)
      toast.error('Failed to assign ticket to team')
    } finally {
      setIsUpdating(false)
      setUpdateType(null)
    }
  }

  const handleAgentAssignment = async (agentId: string) => {
    try {
      setIsUpdating(true)
      setUpdateType('agent')
      await onAssigneeChange(agentId)
      toast.success('Ticket assigned to agent')
      router.refresh()
    } catch (error) {
      console.error('Error assigning ticket to agent:', error)
      toast.error('Failed to assign ticket to agent')
    } finally {
      setIsUpdating(false)
      setUpdateType(null)
    }
  }

  const handleAssignToMe = () => {
    if (currentUserId) {
      handleAgentAssignment(currentUserId)
    }
  }

  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isUpdating}>
            {updateType === 'status' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Status: {ticket.status}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(['new', 'open', 'pending', 'resolved', 'closed'] as TicketStatus[]).map(
            (status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={isUpdating}
              >
                {status}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {onPriorityChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isUpdating}>
              {updateType === 'priority' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Priority: {ticket.priority}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(['low', 'medium', 'high', 'urgent'] as TicketPriority[]).map(
              (priority) => (
                <DropdownMenuItem
                  key={priority}
                  onClick={() => handlePriorityChange(priority)}
                  disabled={isUpdating}
                >
                  {priority}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {teams.length > 0 && onTeamChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isUpdating}>
              {updateType === 'team' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Team
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Select Team</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => handleTeamAssignment(team.id)}
                disabled={isUpdating}
              >
                {team.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {agents.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isUpdating}>
              {updateType === 'agent' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Agent
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Assign To</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {currentUserId && !ticket.assigned_agent_id && (
              <>
                <DropdownMenuItem
                  onClick={handleAssignToMe}
                  disabled={isUpdating}
                >
                  Assign to me
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {agents.map((agent) => (
              <DropdownMenuItem
                key={agent.id}
                onClick={() => handleAgentAssignment(agent.id)}
                disabled={isUpdating}
              >
                {agent.name || agent.email}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
} 