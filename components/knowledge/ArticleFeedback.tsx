'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'

interface ArticleFeedbackProps {
  articleId: string
}

export default function ArticleFeedback({ articleId }: ArticleFeedbackProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [hasFeedback, setHasFeedback] = useState(false)
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function checkFeedback() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return // Don't check feedback for anonymous users

      try {
        const response = await fetch(`/api/knowledge/articles/${articleId}/feedback`)
        if (!response.ok) return
        
        const data = await response.json()
        setHasFeedback(data.hasFeedback)
        setIsHelpful(data.isHelpful)
      } catch (error) {
        console.error('Error checking feedback:', error)
      }
    }

    checkFeedback()
  }, [articleId])

  const submitFeedback = async (helpful: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Please sign in to provide feedback')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/knowledge/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isHelpful: helpful }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit feedback')
      }

      setHasFeedback(true)
      setIsHelpful(helpful)
      toast.success('Thank you for your feedback!')
      router.refresh() // Refresh the page to update counts
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback')
    } finally {
      setIsLoading(false)
    }
  }

  if (hasFeedback) {
    return (
      <div className="text-sm text-muted-foreground">
        You found this article {isHelpful ? 'helpful' : 'not helpful'}
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => submitFeedback(true)}
        disabled={isLoading}
      >
        This was helpful
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => submitFeedback(false)}
        disabled={isLoading}
      >
        Not helpful
      </Button>
    </div>
  )
} 