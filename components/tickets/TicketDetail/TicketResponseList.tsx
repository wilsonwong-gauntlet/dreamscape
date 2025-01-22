import { formatDistanceToNow } from "date-fns"
import { User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Response {
  id: string
  content: string
  created_at: string
  agent_id: string | null
  is_ai: boolean
}

interface TicketResponseListProps {
  ticketId: string
}

export default function TicketResponseList({ ticketId }: TicketResponseListProps) {
  // This would be replaced with real data from your API
  const responses: Response[] = [
    {
      id: "1",
      content: "Thank you for reaching out. We're looking into this issue.",
      created_at: new Date().toISOString(),
      agent_id: "agent-1",
      is_ai: false,
    },
    {
      id: "2",
      content: "I've analyzed your issue and here's what I found...",
      created_at: new Date().toISOString(),
      agent_id: null,
      is_ai: true,
    },
  ]

  return (
    <div className="space-y-4">
      {responses.map((response) => (
        <Card key={response.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  {response.agent_id || "AutoCRM AI"}
                </span>
                {response.is_ai && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    AI Response
                  </Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(response.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{response.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 