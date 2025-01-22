import { useState } from 'react'
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
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, ArrowUpDown } from 'lucide-react'
import type { Ticket } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import TicketFilters, { TicketFilters as FilterOptions } from './TicketFilters'

interface TicketTableProps {
  tickets: Ticket[]
  isLoading?: boolean
}

export default function TicketTable({ tickets, isLoading }: TicketTableProps) {
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  })
  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    priority: []
  })

  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = filters.status.length === 0 || filters.status.includes(ticket.status)
    const priorityMatch = filters.priority.length === 0 || filters.priority.includes(ticket.priority)
    return statusMatch && priorityMatch
  })

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortConfig.key === 'created_at') {
      return sortConfig.direction === 'asc'
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    return 0
  })

  const requestSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const statusColors = {
    new: 'bg-blue-500',
    open: 'bg-yellow-500',
    pending: 'bg-purple-500',
    resolved: 'bg-green-500',
    closed: 'bg-gray-500',
  }

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
    urgent: 'bg-red-500 text-white',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <TicketFilters onFilterChange={setFilters} />
        <div className="text-sm text-muted-foreground">
          {sortedTickets.length} tickets
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Title</TableHead>
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
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-sm">
                  {ticket.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="hover:underline"
                  >
                    {ticket.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={statusColors[ticket.status as keyof typeof statusColors]}
                  >
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={priorityColors[ticket.priority as keyof typeof priorityColors]}
                  >
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  {ticket.assigned_agent_id ? 'Assigned' : 'Unassigned'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Assign Ticket</DropdownMenuItem>
                      <DropdownMenuItem>Change Status</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 