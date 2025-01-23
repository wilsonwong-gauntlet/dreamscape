import { formatDistanceToNow } from "date-fns"
import { User, Bot, Lock, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Response {
  id: string
  ticket_id: string
  author_id: string
  content: string
  type: 'human' | 'ai'
  is_internal: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  author?: {
    id: string
    email: string
    user_metadata: {
      name?: string
    }
  }
}

interface TicketResponseListProps {
  ticketId: string
  responses: Response[]
}

export default function TicketResponseList({ responses }: TicketResponseListProps) {
  if (!responses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No responses yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {responses.map((response) => {
        // Validate the date
        const createdAt = new Date(response.created_at)
        const isValidDate = !isNaN(createdAt.getTime())

        // Get display name
        const displayName = response.author?.user_metadata?.name || 
                          response.author?.email || 
                          'System'

        return (
          <Card 
            key={response.id} 
            className={cn(
              "transition-all",
              response.is_internal && "border-gray-200 bg-gray-50/50",
              response.type === 'ai' && !response.is_internal && "border-indigo-200 bg-indigo-50/50",
              !response.is_internal && response.type === 'human' && "border-gray-200"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full",
                    response.type === 'ai' ? "bg-indigo-100 text-indigo-600" : 
                    response.is_internal ? "bg-gray-100 text-gray-600" :
                    "bg-emerald-100 text-emerald-600"
                  )}>
                    {response.type === 'ai' ? (
                      <Bot className="h-4 w-4" />
                    ) : response.is_internal ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {displayName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {response.type === 'ai' && (
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-none">
                          AI Response
                        </Badge>
                      )}
                      {response.is_internal && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-none">
                          Internal
                        </Badge>
                      )}
                      <span className="text-xs text-gray-400">
                        {isValidDate 
                          ? formatDistanceToNow(createdAt, { addSuffix: true })
                          : 'Invalid date'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={cn(
                "pl-10 whitespace-pre-wrap text-sm",
                response.is_internal ? "text-gray-600" : "text-gray-700"
              )}>
                {response.content}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 