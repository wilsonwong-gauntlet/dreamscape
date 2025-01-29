import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

export interface Response {
  id: string
  content: string
  type: 'ai' | 'human'
  is_internal: boolean
  created_at: string
  author?: {
    id: string
    email: string
    user_metadata: {
      name?: string
    }
  }
}

export function useTicketResponses(ticketId: string) {
  const supabase = createClient()

  const { data: responses, error, mutate } = useSWR(
    ticketId ? `/api/tickets/${ticketId}/responses` : null,
    async () => {
      console.log('[useTicketResponses] Fetching responses for ticket:', ticketId)
      const { data, error } = await supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[useTicketResponses] Error fetching responses:', error)
        throw error
      }
      
      console.log('[useTicketResponses] Fetched responses:', data?.length)
      return data
    },
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: true,
      onSuccess: (data) => {
        console.log('[useTicketResponses] Successfully updated responses:', data?.length)
      }
    }
  )

  const addOptimisticResponse = async (newResponse: Partial<Response>) => {
    console.log('[useTicketResponses] Adding optimistic response:', newResponse)
    // Add optimistic response
    const optimisticResponse = {
      id: 'temp-' + Date.now(),
      created_at: new Date().toISOString(),
      ...newResponse
    }

    await mutate(
      (currentResponses: Response[] = []) => {
        const updatedResponses = [...currentResponses, optimisticResponse as Response]
        console.log('[useTicketResponses] Updated responses after adding:', updatedResponses.length)
        return updatedResponses
      },
      { revalidate: false }
    )

    console.log('[useTicketResponses] Added optimistic response with ID:', optimisticResponse.id)
    return optimisticResponse.id
  }

  const updateOptimisticResponse = async (tempId: string, finalResponse: Response) => {
    console.log('[useTicketResponses] Updating optimistic response:', { tempId, finalResponse })
    await mutate(
      (currentResponses: Response[] = []) => {
        const updatedResponses = currentResponses.map(r => r.id === tempId ? finalResponse : r)
        console.log('[useTicketResponses] Updated responses after update:', 
          updatedResponses.map(r => ({ id: r.id, type: r.type, content: r.content.slice(0, 50) }))
        )
        return updatedResponses
      },
      { revalidate: true }
    )
  }

  return {
    responses,
    error,
    mutate,
    addOptimisticResponse,
    updateOptimisticResponse,
    isLoading: !responses && !error
  }
} 
