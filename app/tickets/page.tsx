import DashboardLayout from "@/components/layout/DashboardLayout"
import TicketTable from "@/components/tickets/TicketList/TicketTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import type { Ticket } from "@/types/database"

export default function TicketsPage() {
  // This would be replaced with real data from your API
  const tickets: Ticket[] = [
    {
      id: "1",
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
    },
    {
      id: "2",
      title: "Feature request: Dark mode",
      status: "open",
      priority: "medium",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      closed_at: null,
      customer_id: "customer-2",
      assigned_agent_id: "agent-1",
      team_id: "product",
      source: "web",
      tags: ["feature-request", "ui"],
      metadata: {},
      custom_fields: {},
      description: "Would love to see a dark mode option in the app.",
    },
    {
      id: "3",
      title: "Payment failed",
      status: "pending",
      priority: "urgent",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      closed_at: null,
      customer_id: "customer-3",
      assigned_agent_id: null,
      team_id: "billing",
      source: "email",
      tags: ["billing", "urgent"],
      metadata: {},
      custom_fields: {},
      description: "My payment was declined but money was deducted from my account.",
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tickets</h1>
          <Link href="/tickets/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </Link>
        </div>

        <TicketTable tickets={tickets} />
      </div>
    </DashboardLayout>
  )
} 