'use client'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SlidersHorizontal } from "lucide-react"
import { useState } from "react"

type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

interface TicketFiltersProps {
  onFilterChange: (filters: TicketFilters) => void
}

export interface TicketFilters {
  status: TicketStatus[]
  priority: TicketPriority[]
}

const statusOptions: TicketStatus[] = ['new', 'open', 'pending', 'resolved', 'closed']
const priorityOptions: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

export default function TicketFilters({ onFilterChange }: TicketFiltersProps) {
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus[]>([])
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority[]>([])

  const handleStatusChange = (status: TicketStatus) => {
    const updated = selectedStatus.includes(status)
      ? selectedStatus.filter(s => s !== status)
      : [...selectedStatus, status]
    setSelectedStatus(updated)
    onFilterChange({ status: updated, priority: selectedPriority })
  }

  const handlePriorityChange = (priority: TicketPriority) => {
    const updated = selectedPriority.includes(priority)
      ? selectedPriority.filter(p => p !== priority)
      : [...selectedPriority, priority]
    setSelectedPriority(updated)
    onFilterChange({ status: selectedStatus, priority: updated })
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
            {(selectedStatus.length > 0 || selectedPriority.length > 0) && (
              <span className="ml-2 rounded-full bg-primary w-5 h-5 text-[11px] flex items-center justify-center text-primary-foreground">
                {selectedStatus.length + selectedPriority.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statusOptions.map(status => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={selectedStatus.includes(status)}
              onCheckedChange={() => handleStatusChange(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Priority</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {priorityOptions.map(priority => (
            <DropdownMenuCheckboxItem
              key={priority}
              checked={selectedPriority.includes(priority)}
              onCheckedChange={() => handlePriorityChange(priority)}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 