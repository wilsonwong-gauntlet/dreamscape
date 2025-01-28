'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Filter } from 'lucide-react'

export interface SupportFilters {
  status: string[]
  priority: string[]
}

interface SupportFiltersProps {
  onFilterChange: (filters: SupportFilters) => void
}

export default function SupportFilters({ onFilterChange }: SupportFiltersProps) {
  const [filters, setFilters] = useState<SupportFilters>({
    status: [],
    priority: []
  })

  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ]

  const toggleStatus = (status: string) => {
    setFilters(current => ({
      ...current,
      status: current.status.includes(status)
        ? current.status.filter(s => s !== status)
        : [...current.status, status]
    }))
  }

  const togglePriority = (priority: string) => {
    setFilters(current => ({
      ...current,
      priority: current.priority.includes(priority)
        ? current.priority.filter(p => p !== priority)
        : [...current.priority, priority]
    }))
  }

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: []
    })
  }

  const totalFilters = filters.status.length + filters.priority.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {totalFilters > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 rounded-sm px-1 font-normal lg:hidden"
            >
              {totalFilters}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statusOptions.map(({ value, label }) => (
          <DropdownMenuCheckboxItem
            key={value}
            checked={filters.status.includes(value)}
            onCheckedChange={() => toggleStatus(value)}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Priority</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {priorityOptions.map(({ value, label }) => (
          <DropdownMenuCheckboxItem
            key={value}
            checked={filters.priority.includes(value)}
            onCheckedChange={() => togglePriority(value)}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}

        {totalFilters > 0 && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 