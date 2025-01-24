"use client"

import { SatisfactionRating } from '@/components/tickets/SatisfactionRating'
import { cn } from '@/lib/utils'
import { StarIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'

interface TicketSatisfactionSectionProps {
  ticketId: string
  status: string
  satisfactionScore: number | null
}

export function TicketSatisfactionSection({ 
  ticketId, 
  status, 
  satisfactionScore 
}: TicketSatisfactionSectionProps) {
  const router = useRouter()

  if (status === 'resolved' && !satisfactionScore) {
    return (
      <div className="mt-6 border-t pt-6">
        <SatisfactionRating 
          ticketId={ticketId} 
          onRated={() => {
            router.refresh()
          }} 
        />
      </div>
    )
  }

  if (satisfactionScore) {
    return (
      <div className="mt-6 border-t pt-6">
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-500">Customer Satisfaction Rating</div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((score) => (
              <StarIcon
                key={score}
                className={cn(
                  "h-6 w-6",
                  score <= satisfactionScore
                    ? "text-yellow-400"
                    : "text-gray-200"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
} 