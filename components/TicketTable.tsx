'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MoreHorizontal } from 'lucide-react'
import { createClient } from '@/app/utils/server'

type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

interface ExtendedTicket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  created_at: string
  customer_id: string
  assigned_agent_id: string | null
  team_id: string | null
  customers: {
    id: string
    company: string | null
  } | null
  agents: {
    id: string
    team_id: string | null
  } | null
  teams: {
    id: string
    name: string
  } | null
}

interface TicketTableProps {
  tickets: ExtendedTicket[]
  loading?: boolean
}

export function TicketTable({ tickets: initialTickets, loading = false }: TicketTableProps) {
  const [tickets, setTickets] = useState(initialTickets)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ExtendedTicket;
    direction: 'asc' | 'desc';
  }>({
    key: 'created_at',
    direction: 'desc',
  })

  const sortedTickets = useMemo(() => {
    if (!tickets) return []
    
    const sorted = [...tickets].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]
      if (!aValue || !bValue) return 0
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
    
    return sorted
  }, [tickets, sortConfig])

  const handleSort = (key: keyof ExtendedTicket) => {
    setSortConfig(config => ({
      key,
      direction: config.key === key && config.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update ticket status')
      }

      // Update local state
      setTickets(currentTickets =>
        currentTickets.map(ticket =>
          ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
        )
      )
    } catch (error) {
      console.error('Error updating ticket status:', error)
      // You might want to show a toast notification here
    }
  }

  const handleTeamAssignment = async (ticketId: string, teamId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ team_id: teamId }),
      })

      if (!response.ok) {
        throw new Error('Failed to update ticket team')
      }

      // Update local state
      setTickets(currentTickets =>
        currentTickets.map(ticket =>
          ticket.id === ticketId ? { ...ticket, team_id: teamId } : ticket
        )
      )
    } catch (error) {
      console.error('Error updating ticket team:', error)
      // You might want to show a toast notification here
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Team</TableHead>
            <TableHead onClick={() => handleSort('created_at')} className="cursor-pointer">
              Created
              {sortConfig.key === 'created_at' && (
                <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
              )}
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>{ticket.title}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-fit px-2">
                      <Badge
                        variant={
                          ticket.status === 'resolved' || ticket.status === 'closed'
                            ? 'outline'
                            : ticket.status === 'pending'
                            ? 'secondary'
                            : 'default'
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(['new', 'open', 'pending', 'resolved', 'closed'] as TicketStatus[]).map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleStatusChange(ticket.id, status)}
                      >
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    ticket.priority === 'urgent'
                      ? 'destructive'
                      : ticket.priority === 'high'
                      ? 'secondary'
                      : 'default'
                  }
                >
                  {ticket.priority}
                </Badge>
              </TableCell>
              <TableCell>{ticket.customers?.company || 'Unknown'}</TableCell>
              <TableCell>{ticket.teams?.name || 'Unassigned'}</TableCell>
              <TableCell>{format(new Date(ticket.created_at), 'MMM d, yyyy')}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Link href={`/tickets/${ticket.id}`}>View details</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 