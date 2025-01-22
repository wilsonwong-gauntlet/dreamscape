import DashboardLayout from "@/components/layout/DashboardLayout"
import TicketForm from "@/components/tickets/TicketForm/TicketForm"
import type { Ticket } from "@/types/database"
import { createClient } from "@/app/utils/server"
import { revalidatePath } from "next/cache"
import { PostgrestError } from "@supabase/supabase-js"

async function createTicket(ticket: Partial<Ticket>) {
  'use server'
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    // Log detailed user information
    console.log('User attempting to create ticket:', {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role,
      metadata: user.user_metadata,
      created_at: user.created_at,
      last_sign_in: user.last_sign_in_at
    })

    // First, ensure user exists in customers table
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select()
      .eq('id', user.id)
      .single()

    if (customerError) {
      console.log('Error checking customer:', customerError)
    }

    console.log('Existing customer record:', customer)

    if (!customer) {
      console.log('Creating new customer record for user:', user.id)
      const { error: insertError } = await supabase.from('customers').insert({
        id: user.id,
        metadata: {}
      })
      if (insertError) {
        console.log('Error creating customer record:', insertError)
      }
    }

    // Prepare the ticket data with required fields
    const ticketData = {
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority || 'medium',
      customer_id: user.id,
      status: "new",
      source: "web",
      tags: [],
      metadata: {},
      custom_fields: {},
    }

    console.log('Prepared ticket data:', ticketData)

    const { data, error } = await supabase
      .from('tickets')
      .insert([ticketData])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(`Failed to create ticket: ${error.message}`)
    }

    revalidatePath('/tickets')
    return data
  } catch (error) {
    console.error('Error in createTicket:', error)
    throw error
  }
}

export default function NewTicketPage() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Create New Ticket</h1>
        <TicketForm onSubmit={createTicket} />
      </div>
    </DashboardLayout>
  )
} 