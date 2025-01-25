"use client"

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import TicketDetail from './TicketDetail'
import { toast } from 'sonner'

interface CustomerDetails {
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
  };
}

interface TicketDetailWrapperProps {
  ticket: any // TODO: Add proper type
  teams: any[]
  agents: any[]
  currentUserId: string
  ticketId: string
}

export default function TicketDetailWrapper({
  ticket,
  teams,
  agents,
  currentUserId,
  ticketId
}: TicketDetailWrapperProps) {
  const router = useRouter()
  const supabase = createClient()
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null)

  useEffect(() => {
    async function fetchCustomerDetails() {
      if (ticket.customer?.id) {
        console.log('Fetching customer details for ID:', ticket.customer.id)
        try {
          const response = await fetch(`/api/customers/${ticket.customer.id}`)
          console.log('API Response status:', response.status)
          if (!response.ok) throw new Error('Failed to fetch customer details')
          const data = await response.json()
          console.log('Received customer details:', data)
          setCustomerDetails(data)
        } catch (error) {
          console.error('Error fetching customer details:', error)
          toast.error('Failed to load customer details')
        }
      } else {
        console.log('No customer ID available:', ticket.customer)
      }
    }

    fetchCustomerDetails()
  }, [ticket.customer?.id])

  // Add logging for render
  console.log('TicketDetailWrapper render:', {
    ticketId,
    customerId: ticket.customer?.id,
    customerDetails,
  })

  const handleStatusChange = async (status: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', ticketId)

    if (error) {
      console.error('Error updating status:', error)
      return
    }

    // Add history entry
    await supabase.from('ticket_history').insert({
      ticket_id: ticketId,
      actor_id: currentUserId,
      action: 'update',
      changes: { status }
    })

    router.refresh()
  }

  const handleAssigneeChange = async (agentId: string | null) => {
    const { error } = await supabase
      .from('tickets')
      .update({ assigned_agent_id: agentId })
      .eq('id', ticketId)

    if (error) {
      console.error('Error updating assignee:', error)
      return
    }

    // Add history entry
    await supabase.from('ticket_history').insert({
      ticket_id: ticketId,
      actor_id: currentUserId,
      action: 'update',
      changes: { assigned_agent_id: agentId }
    })

    router.refresh()
  }

  const handleTagsChange = async (tags: string[]) => {
    const { error } = await supabase
      .from('tickets')
      .update({ tags })
      .eq('id', ticketId)

    if (error) {
      console.error('Error updating tags:', error)
      return
    }

    // Add history entry
    await supabase.from('ticket_history').insert({
      ticket_id: ticketId,
      actor_id: currentUserId,
      action: 'update',
      changes: { tags }
    })

    router.refresh()
  }

  const handlePriorityChange = async (priority: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({ priority })
      .eq('id', ticketId)

    if (error) {
      console.error('Error updating priority:', error)
      return
    }

    // Add history entry
    await supabase.from('ticket_history').insert({
      ticket_id: ticketId,
      actor_id: currentUserId,
      action: 'update',
      changes: { priority }
    })

    router.refresh()
  }

  const handleTeamChange = async (teamId: string | null) => {
    const { error } = await supabase
      .from('tickets')
      .update({ team_id: teamId })
      .eq('id', ticketId)

    if (error) {
      console.error('Error updating team:', error)
      return
    }

    // Add history entry
    await supabase.from('ticket_history').insert({
      ticket_id: ticketId,
      actor_id: currentUserId,
      action: 'update',
      changes: { team_id: teamId }
    })

    router.refresh()
  }

  return (
    <TicketDetail
      ticket={ticket}
      teams={teams}
      agents={agents}
      currentUserId={currentUserId}
      customerDetails={customerDetails}
      onStatusChange={handleStatusChange}
      onPriorityChange={handlePriorityChange}
      onTeamChange={handleTeamChange}
      onAssigneeChange={handleAssigneeChange}
      onTagsChange={handleTagsChange}
    />
  )
} 