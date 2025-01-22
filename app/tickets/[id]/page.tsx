import DashboardLayout from "@/components/layout/DashboardLayout"
import TicketDetail from "@/components/tickets/TicketDetail/TicketDetail"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Ticket } from "@/types/database"

interface Props {
  params: {
    id: string
  }
}

export default function TicketDetailPage({ params }: Props) {
  // This would be replaced with real data from your API
  const ticket: Ticket = {
    id: params.id,
    title: "Cannot access my account",
    status: "new",
    priority: "high",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    closed_at: null,
    customer_id: "customer-1",
    assigned_agent_id: null,
    team_id: "support",
    source: "email",
    tags: ["login", "authentication"],
    metadata: {},
    custom_fields: {},
    description: "I'm unable to log in to my account. It says invalid credentials.",
  }

  const handleStatusChange = async (status: string) => {
    // This would be replaced with your API call
    console.log("Updating status:", status)
  }

  const handleAssigneeChange = async (agentId: string) => {
    // This would be replaced with your API call
    console.log("Assigning to:", agentId)
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/tickets">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Ticket Details</h1>
        </div>

        <TicketDetail
          ticket={ticket}
          onStatusChange={handleStatusChange}
          onAssigneeChange={handleAssigneeChange}
        />
      </div>
    </DashboardLayout>
  )
} 