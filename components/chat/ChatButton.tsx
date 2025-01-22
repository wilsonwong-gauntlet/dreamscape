'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatButtonProps {
  isOpen: boolean
  onClick: () => void
  className?: string
}

export function ChatButton({ isOpen, onClick, className }: ChatButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        'fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg',
        className
      )}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
      <span className="sr-only">
        {isOpen ? 'Close chat' : 'Open chat'}
      </span>
    </Button>
  )
} 