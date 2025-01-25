// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts"

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIProcessingResult {
  canAutoResolve: boolean
  response?: string
  confidence: number
  suggestedTeamId?: string
  routingAnalysis: {
    priority: 'low' | 'medium' | 'high' | 'urgent'
    category: string
    tags: string[]
    complexity: 'simple' | 'medium' | 'complex'
    expertise: string[]
  }
  ticketData?: any
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

    // Get ticket data from request
    const { ticketId } = await req.json()
    if (!ticketId) {
      throw new TicketError('ticketId is required', 400)
    }

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select(`
        *,
        customer:customers(id, metadata),
        assigned_agent:agents(id, team_id, role),
        team:teams(id, name)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      throw new TicketError('Failed to fetch ticket details', 404)
    }

    // Fetch customer history
    const { data: customerHistory, error: historyError } = await supabaseClient
      .from('tickets')
      .select('status, created_at')
      .eq('customer_id', ticket.customer_id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (historyError) {
      console.error('Failed to fetch customer history:', historyError)
    }

    // 1. Analyze ticket content
    const analysis = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an AI support system analyzing customer support tickets.
          You can automatically resolve tickets that:
          1. Are common, standard procedures (including password resets, setting changes)
          2. Can be solved with standard instructions
          3. Don't require human verification
          4. Don't involve account compromise or sensitive data

          Examples of auto-resolvable tickets:
          - Password changes and resets (when following standard process)
          - Account settings modifications
          - Feature usage instructions
          - General platform navigation
          - Basic troubleshooting steps
          - General meditation or wellness tips

          Examples of non-auto-resolvable tickets:
          - Account compromise reports
          - Personal data requests
          - Complex technical issues
          - Mental health concerns
          - Billing disputes
          - Bug reports
          
          For each ticket, determine:
          1. If you can resolve it automatically (true/false)
          2. The confidence level (0-1)
          3. Detailed routing analysis:
             - Priority level (low/medium/high/urgent)
             - Category of the issue
             - Relevant tags
             - Complexity level (simple/medium/complex)
             - Required expertise areas
          
          Respond in JSON format only with snake_case keys.`
        },
        {
          role: "user",
          content: `Ticket Title: ${ticket.title}
Description: ${ticket.description}
Customer History: ${customerHistory ? JSON.stringify(customerHistory) : 'No history'}
Previous Interactions: ${ticket.metadata?.previous_interactions || 'None'}`
        }
      ],
      response_format: { type: "json_object" }
    })

    const content = analysis.choices[0].message.content
    if (!content) {
      throw new TicketError('No content in AI response', 500)
    }
    
    console.log('Raw AI response:', content)
    
    let result: AIProcessingResult
    try {
      const parsed = JSON.parse(content)
      console.log('Parsed AI response:', parsed)
      
      // Use the specific AI team ID
      const AI_TEAM_ID = 'c4b5b62b-df0c-44f7-9fa8-6aad40e7dfcb'
      
      // Determine if we can auto-resolve based on both the AI's decision and confidence
      const confidence = Number(parsed.confidence_level) || 0
      const aiSaysCanResolve = Boolean(parsed.can_resolve_automatically || parsed.can_resolve)
      const confidenceThresholdMet = confidence >= 0.8
      const canAutoResolve = aiSaysCanResolve && confidenceThresholdMet
      
      // Ensure the response has the expected structure and map the fields
      result = {
        canAutoResolve,
        confidence,
        // If ticket can be auto-resolved, assign to AI team
        suggestedTeamId: canAutoResolve ? AI_TEAM_ID : undefined,
        routingAnalysis: {
          priority: (parsed.detailed_routing_analysis?.priority_level || 'medium').toLowerCase() as 'low' | 'medium' | 'high' | 'urgent',
          category: parsed.detailed_routing_analysis?.category_of_the_issue || 'general',
          tags: Array.isArray(parsed.detailed_routing_analysis?.relevant_tags) ? parsed.detailed_routing_analysis.relevant_tags : [],
          complexity: (parsed.detailed_routing_analysis?.complexity_level || 'medium').toLowerCase() as 'simple' | 'medium' | 'complex',
          expertise: Array.isArray(parsed.detailed_routing_analysis?.required_expertise_areas) ? parsed.detailed_routing_analysis.required_expertise_areas : []
        }
      }
      console.log('Normalized result:', result)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      throw new TicketError('Invalid AI response format', 500)
    }

    // 2. If AI can resolve, generate response
    if (result.canAutoResolve) {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a helpful customer support agent. Provide a clear, friendly, and complete response to the customer's issue."
          },
          {
            role: "user",
            content: `Ticket Title: ${ticket.title}\nDescription: ${ticket.description}`
          }
        ]
      })

      const responseContent = response.choices[0].message.content
      if (!responseContent) {
        throw new TicketError('No content in AI response', 500)
      }

      // Save AI response
      const { error: responseError } = await supabaseClient
        .from('ticket_responses')
        .insert({
          ticket_id: ticketId,
          content: responseContent,
          type: 'ai',
          author_id: null,
          metadata: { confidence: result.confidence }
        })

      if (responseError) {
        throw new TicketError('Failed to save AI response', 500)
      }

      // Update ticket status
      const { error: updateError } = await supabaseClient
        .from('tickets')
        .update({ status: 'resolved' })
        .eq('id', ticketId)

      if (updateError) {
        throw new TicketError('Failed to update ticket status', 500)
      }

      return new Response(
        JSON.stringify({
          canAutoResolve: true,
          response: responseContent,
          confidence: result.confidence,
          routingAnalysis: result.routingAnalysis
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // 3. If needs human attention, prepare ticket data for routing
    const ticketData = {
      title: ticket.title,
      description: ticket.description,
      priority: result.routingAnalysis.priority,
      category: result.routingAnalysis.category,
      tags: result.routingAnalysis.tags,
      complexity: result.routingAnalysis.complexity,
      expertise: result.routingAnalysis.expertise,
      source: ticket.source,
      metadata: ticket.metadata
    }

    // Evaluate routing rules
    const { data: routingResult, error: routingError } = await supabaseClient
      .rpc('evaluate_routing_rules', {
        ticket_data: ticketData
      })
      .maybeSingle()

    if (routingError) {
      console.error('Routing error:', routingError)
    }

    // Apply routing if available
    if (routingResult) {
      const updates: Record<string, string> = {}
      
      if (routingResult.action === 'assign_team') {
        updates.team_id = routingResult.action_target
      } else if (routingResult.action === 'assign_agent') {
        updates.assigned_agent_id = routingResult.action_target
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabaseClient
          .from('tickets')
          .update({ ...updates, status: 'open' })
          .eq('id', ticketId)

        if (updateError) {
          console.error('Error applying routing:', updateError)
        } else {
          // Add to ticket history
          await supabaseClient
            .from('ticket_history')
            .insert({
              ticket_id: ticketId,
              action: 'route',
              actor_id: null,
              changes: {
                rule_id: routingResult.rule_id,
                ...updates
              }
            })
        }
      }
    }

    return new Response(
      JSON.stringify({
        canAutoResolve: false,
        confidence: result.confidence,
        suggestedTeamId: result.suggestedTeamId,
        routingAnalysis: result.routingAnalysis,
        ticketData,
        routing: routingResult
      }),
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
      JSON.stringify({ 
        error: message,
        canAutoResolve: false,
        confidence: 0,
        routingAnalysis: {
          priority: 'medium',
          category: 'general',
          tags: [],
          complexity: 'medium',
          expertise: []
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      },
    )
  }
}) 