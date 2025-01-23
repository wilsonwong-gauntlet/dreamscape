'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { MoreHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, Clock, AlertTriangle, MessageSquare, User, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import TicketFilters, { TicketFilters as FilterOptions } from './TicketFilters'
import { SavedView, ExtendedTicket } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface TicketTableProps {
  tickets: ExtendedTicket[]
  isLoading?: boolean
  teams?: { id: string; name: string }[]
  agents?: { id: string; name: string; email: string }[]
  currentUserId: string
}

const ITEMS_PER_PAGE = 10

interface QuickFilter {
  id: string
  label: string
  icon: React.ReactNode
  filter: (ticket: ExtendedTicket) => boolean
}

export default function TicketTable({ tickets, isLoading, teams = [], agents = [], currentUserId }: TicketTableProps) {
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  })
  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    priority: []
  })
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [view, setView] = useState<SavedView | null>(null)

  // Memoize quick filters to prevent recreation on every render
  const quickFilters = useMemo(() => [
    {
      id: 'myTickets',
      label: 'My Tickets',
      icon: <User className="w-4 h-4" />,
      filter: (ticket: ExtendedTicket) => ticket.assigned_agent?.id === currentUserId
    },
    {
      id: 'unassigned',
      label: 'Unassigned',
      icon: <Users className="w-4 h-4" />,
      filter: (ticket: ExtendedTicket) => !ticket.assigned_agent
    },
    {
      id: 'urgent',
      label: 'Urgent',
      icon: <AlertTriangle className="w-4 h-4" />,
      filter: (ticket: ExtendedTicket) => ticket.priority === 'urgent'
    }
  ], [currentUserId])

  // Memoize filtered tickets to prevent unnecessary recalculations
  const filteredTickets = useMemo(() => {
    let filtered = tickets

    // Apply Quick View filters if a view is selected
    if (view) {
      filtered = tickets.filter(ticket => {
        const { filters } = view
        if (filters.status?.length && !filters.status.includes(ticket.status)) return false
        if (filters.priority?.length && !filters.priority.includes(ticket.priority)) return false
        if (filters.assignedTo !== undefined) {
          if (filters.assignedTo === null && ticket.assigned_agent !== null) return false
          if (filters.assignedTo !== null && ticket.assigned_agent?.id !== filters.assignedTo) return false
        }
        if (filters.lastResponseBy === 'customer') {
          if (!ticket.last_response) return true
          return ticket.last_response.author_id === ticket.customer?.id
        }
        return true
      })
    } else if (activeFilter) {
      // Apply quick filter if selected
      const filter = quickFilters.find(f => f.id === activeFilter)
      if (filter) {
        filtered = tickets.filter(filter.filter)
      }
    } else {
      // Apply regular filters
      filtered = tickets.filter(ticket => {
        const statusMatch = filters.status.length === 0 || filters.status.includes(ticket.status)
        const priorityMatch = filters.priority.length === 0 || filters.priority.includes(ticket.priority)
        return statusMatch && priorityMatch
      })
    }

    return filtered
  }, [tickets, view, activeFilter, filters, quickFilters])

  // Memoize sorted tickets
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      if (sortConfig.key === 'created_at') {
        return sortConfig.direction === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      return 0
    })
  }, [filteredTickets, sortConfig])

  // Calculate pagination
  const totalPages = Math.ceil(sortedTickets.length / ITEMS_PER_PAGE)
  const paginatedTickets = sortedTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [view, activeFilter, filters])

  const requestSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedTickets(checked ? paginatedTickets.map(t => t.id) : [])
  }

  const handleSelectTicket = (ticketId: string, checked: boolean | string) => {
    if (typeof checked === 'string') return
    setSelectedTickets(current => 
      checked 
        ? [...current, ticketId]
        : current.filter(id => id !== ticketId)
    )
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedTickets.length === 0) return

    try {
      setIsUpdating(true)
      const response = await fetch('/api/tickets/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketIds: selectedTickets,
          operation: 'update',
          data: { status: newStatus }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update tickets')
      }

      toast.success(`Updated ${selectedTickets.length} tickets`)
      setSelectedTickets([])
      window.location.reload()
    } catch (error) {
      console.error('Error updating tickets:', error)
      toast.error('Failed to update tickets')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBulkTeamAssignment = async (teamId: string) => {
    if (selectedTickets.length === 0) return

    try {
      setIsUpdating(true)
      const response = await fetch('/api/tickets/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketIds: selectedTickets,
          operation: 'update',
          data: { team_id: teamId }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign tickets')
      }

      toast.success(`Assigned ${selectedTickets.length} tickets to team`)
      setSelectedTickets([])
      window.location.reload()
    } catch (error) {
      console.error('Error assigning tickets:', error)
      toast.error('Failed to assign tickets')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBulkAgentAssignment = async (agentId: string) => {
    if (selectedTickets.length === 0) return

    try {
      setIsUpdating(true)
      const response = await fetch('/api/tickets/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketIds: selectedTickets,
          operation: 'update',
          data: { assigned_agent_id: agentId }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign tickets')
      }

      toast.success(`Assigned ${selectedTickets.length} tickets to agent`)
      setSelectedTickets([])
      window.location.reload()
    } catch (error) {
      console.error('Error assigning tickets:', error)
      toast.error('Failed to assign tickets')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      toast.success('Status updated successfully')
      window.location.reload()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssignAgent = async (ticketId: string, agentId: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigned_agent_id: agentId })
      })

      if (!response.ok) {
        throw new Error('Failed to assign ticket')
      }

      toast.success('Ticket assigned successfully')
      window.location.reload()
    } catch (error) {
      console.error('Error assigning ticket:', error)
      toast.error('Failed to assign ticket')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority: newPriority })
      })

      if (!response.ok) {
        throw new Error('Failed to update priority')
      }

      toast.success('Priority updated successfully')
      window.location.reload()
    } catch (error) {
      console.error('Error updating priority:', error)
      toast.error('Failed to update priority')
    } finally {
      setIsUpdating(false)
    }
  }

  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    open: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-purple-100 text-purple-800',
    closed: 'bg-gray-100 text-gray-800'
  } as const

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  } as const

  const quickViews = [
    { 
      id: 'my-open', 
      name: 'My Open Tickets',
      filters: {
        status: ['open', 'pending'],
        assignedTo: currentUserId
      }
    },
    { 
      id: 'urgent-unassigned', 
      name: 'Urgent & Unassigned',
      filters: {
        priority: ['urgent'],
        assignedTo: null
      }
    },
    {
      id: 'needs-response',
      name: 'Needs Response',
      filters: {
        status: ['open'],
        lastResponseBy: 'customer'
      }
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        {quickFilters.map(filter => (
          <Button
            key={filter.id}
            variant={activeFilter === filter.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
            className="flex items-center gap-2"
          >
            {filter.icon}
            {filter.label}
            <Badge variant="secondary" className="ml-2">
              {tickets.filter(filter.filter).length}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Open</div>
          <div className="text-2xl font-bold">
            {tickets.filter(t => t.status !== 'closed').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Unassigned</div>
          <div className="text-2xl font-bold">
            {tickets.filter(t => !t.assigned_agent).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Urgent</div>
          <div className="text-2xl font-bold text-red-600">
            {tickets.filter(t => t.priority === 'urgent').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">My Open</div>
          <div className="text-2xl font-bold">
            {tickets.filter(t => t.assigned_agent?.id === currentUserId && t.status !== 'closed').length}
          </div>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <TicketFilters onFilterChange={setFilters} />
        <div className="flex items-center gap-4">
          {selectedTickets.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedTickets.length} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUpdating}>
                    Bulk Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(['new', 'open', 'pending', 'resolved', 'closed'] as const).map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleBulkStatusChange(status)}
                    >
                      Set to {status}
                    </DropdownMenuItem>
                  ))}
                  
                  {teams.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Assign Team</DropdownMenuLabel>
                      {teams.map((team) => (
                        <DropdownMenuItem
                          key={team.id}
                          onClick={() => handleBulkTeamAssignment(team.id)}
                        >
                          {team.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {agents.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Assign Agent</DropdownMenuLabel>
                      {agents.map((agent) => (
                        <DropdownMenuItem
                          key={agent.id}
                          onClick={() => handleBulkAgentAssignment(agent.id)}
                        >
                          {agent.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            {sortedTickets.length} tickets
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">
                <Checkbox
                  checked={
                    paginatedTickets.length > 0 &&
                    paginatedTickets.every(t => selectedTickets.includes(t.id))
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => requestSort('created_at')}
                >
                  Created
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTickets.map((ticket) => {
              return (
                <TableRow 
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, a, input')) {
                      return
                    }
                    window.location.href = `/tickets/${ticket.id}`
                  }}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTickets.includes(ticket.id)}
                      onCheckedChange={(checked) => handleSelectTicket(ticket.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {ticket.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    {ticket.title}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{ticket.customer?.user?.email || 'Unknown'}</span>
                      <span className="text-sm text-muted-foreground">
                        {ticket.customer?.company || 'No company'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="p-0 h-auto font-normal">
                          <Badge
                            className={statusColors[ticket.status]}
                          >
                            {ticket.status}
                          </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(['new', 'open', 'pending', 'resolved', 'closed'] as const).map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => handleStatusChange(ticket.id, status)}
                          >
                            <Badge className={statusColors[status]} variant="secondary">
                              {status}
                            </Badge>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="p-0 h-auto font-normal">
                          <Badge
                            className={priorityColors[ticket.priority]}
                          >
                            {ticket.priority}
                          </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                          <DropdownMenuItem
                            key={priority}
                            onClick={() => handlePriorityChange(ticket.id, priority)}
                          >
                            <Badge className={priorityColors[priority]} variant="secondary">
                              {priority}
                            </Badge>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ticket.team?.name || 'Unassigned'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ticket.assigned_agent?.user.email || 'Unassigned'}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/tickets/${ticket.id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        
                        {agents.length > 0 && (
                          <>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Assign Ticket</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {agents.map((agent) => (
                                  <DropdownMenuItem
                                    key={agent.id}
                                    onClick={() => handleAssignAgent(ticket.id, agent.id)}
                                  >
                                    {agent.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 