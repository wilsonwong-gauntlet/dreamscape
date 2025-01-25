// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts"

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

class TicketError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'TicketError';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Initialize clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    })

    // Get ticket ID from request
    const { ticketId } = await req.json()
    if (!ticketId) {
      throw new TicketError('ticketId is required', 400)
    }

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select(`
        *,
        customer:customers(id, company),
        assigned_agent:agents(id, team_id, role),
        team:teams(id, name)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      throw new TicketError('Failed to fetch ticket details', 404)
    }

    // Fetch conversation history
    const { data: responses, error: responsesError } = await supabaseClient
      .from('ticket_responses')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (responsesError) {
      throw new TicketError('Failed to fetch conversation history', 404)
    }

    // Format conversation history
    const history = responses
      .map((r) => `${r.type === 'human' ? 'Customer' : 'Agent'}: ${r.content}`)
      .join('\n')

    // Generate AI response
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful customer support agent. Provide clear, friendly, and complete responses.' 
        },
        { 
          role: 'user', 
          content: `Ticket: ${ticket.title}\n${ticket.description}\n\nHistory:\n${history}\n\nProvide a helpful response.` 
        }
      ],
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
    })

    const result = chatCompletion.choices[0].message.content
    if (!result) {
      throw new TicketError('Failed to generate AI response', 500)
    }

    return new Response(
      JSON.stringify({ response: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    const statusCode = error instanceof TicketError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'Internal server error'
    
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      },
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-ticket-response' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
