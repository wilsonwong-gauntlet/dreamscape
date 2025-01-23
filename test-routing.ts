import { createClient } from '@/utils/supabase/server'

async function testRouting() {
  const supabase = await createClient()
  
  // Create a test ticket
  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      title: 'Test High Priority Issue',
      description: 'This is a test ticket for routing',
      priority: 'high',
      source: 'web',
      tags: ['test'],
      metadata: {},
      custom_fields: {},
      status: 'new'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating ticket:', error)
    return
  }

  console.log('Created ticket:', ticket)

  // Wait a moment for routing to complete
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Check the ticket's final state
  const { data: updatedTicket, error: fetchError } = await supabase
    .from('tickets')
    .select(`
      *,
      team:teams(name)
    `)
    .eq('id', ticket.id)
    .single()

  if (fetchError) {
    console.error('Error fetching updated ticket:', fetchError)
    return
  }

  console.log('Updated ticket:', updatedTicket)

  // Check ticket history
  const { data: history, error: historyError } = await supabase
    .from('ticket_history')
    .select('*')
    .eq('ticket_id', ticket.id)
    .eq('action', 'route')

  if (historyError) {
    console.error('Error fetching history:', historyError)
    return
  }

  console.log('Ticket history:', history)
}

testRouting().catch(console.error) 