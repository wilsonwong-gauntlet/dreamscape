import { formatDistanceToNow } from "date-fns"
import { User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
    return <div className="text-muted-foreground">No responses yet</div>
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
          <Card key={response.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    {displayName}
                  </span>
                  {response.type === 'ai' && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      AI Response
                    </Badge>
                  )}
                  {response.is_internal && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      Internal
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {isValidDate 
                    ? formatDistanceToNow(createdAt, { addSuffix: true })
                    : 'Invalid date'}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{response.content}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 