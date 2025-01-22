'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

interface Team {
  id: string
  name: string
}

interface Ticket {
  id: string
  status: TicketStatus
  priority: TicketPriority
  team_id: string | null
}

interface TicketActionsProps {
  ticket: Ticket
  teams: Team[]
}

export function TicketActions({ ticket, teams }: TicketActionsProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update ticket status')
      }

      router.refresh()
    } catch (error) {
      console.error('Error updating ticket status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority: newPriority }),
      })

      if (!response.ok) {
        throw new Error('Failed to update ticket priority')
      }

      router.refresh()
    } catch (error) {
      console.error('Error updating ticket priority:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTeamAssignment = async (teamId: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ team_id: teamId }),
      })

      if (!response.ok) {
        throw new Error('Failed to update ticket team')
      }

      router.refresh()
    } catch (error) {
      console.error('Error updating ticket team:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isUpdating}>
            Status: {ticket.status}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(['new', 'open', 'pending', 'resolved', 'closed'] as TicketStatus[]).map(
            (status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusChange(status)}
              >
                {status}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isUpdating}>
            Priority: {ticket.priority}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(['low', 'medium', 'high', 'urgent'] as TicketPriority[]).map(
            (priority) => (
              <DropdownMenuItem
                key={priority}
                onClick={() => handlePriorityChange(priority)}
              >
                {priority}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isUpdating}>
            Assign Team
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => handleTeamAssignment(team.id)}
            >
              {team.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 