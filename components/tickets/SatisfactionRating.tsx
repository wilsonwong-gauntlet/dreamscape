"use client"

import { StarIcon } from "@heroicons/react/24/solid"
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SatisfactionRatingProps {
  ticketId: string
  onRated?: () => void
}

export function SatisfactionRating({ ticketId, onRated }: SatisfactionRatingProps) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const labels = {
    1: "Very Dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very Satisfied"
  }

  async function handleRating(score: number) {
    if (submitting) return
    
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/satisfaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit rating')
      }

      setSelectedScore(score)
      toast.success('Thank you for your feedback!')
      onRated?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  if (selectedScore) {
    return (
      <div className="flex flex-col items-center gap-2 p-4">
        <div className="text-sm text-gray-500">Thank you for your feedback!</div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((score) => (
            <StarIcon
              key={score}
              className={cn(
                "h-6 w-6",
                score <= selectedScore ? "text-yellow-400" : "text-gray-200"
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <div className="text-sm text-gray-500">How satisfied were you with our service?</div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            className="p-1 hover:scale-110 transition-transform"
            onMouseEnter={() => setHoveredStar(score)}
            onMouseLeave={() => setHoveredStar(null)}
            onClick={() => handleRating(score)}
            disabled={submitting}
          >
            {score <= (hoveredStar ?? 0) ? (
              <StarIcon className="h-6 w-6 text-yellow-400" />
            ) : (
              <StarOutlineIcon className="h-6 w-6 text-gray-400" />
            )}
          </button>
        ))}
      </div>
      {hoveredStar && (
        <div className="text-sm text-gray-600 h-5">
          {labels[hoveredStar as keyof typeof labels]}
        </div>
      )}
    </div>
  )
} 