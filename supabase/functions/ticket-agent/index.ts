import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts"

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TicketState {
  ticketId: string
  ticket: any
  customerHistory: any[]
  kbArticles: any[]
  analysis: {
    canAutoResolve: boolean
    confidence: number
    routingAnalysis: {
      priority: 'low' | 'medium' | 'high' | 'urgent'
      category: string
      tags: string[]
      complexity: 'simple' | 'medium' | 'complex'
      expertise: string[]
    }
  }
  aiResponse?: string
  suggestedTeamId?: string
  routingRules?: any[]
}

// Tool for fetching relevant KB articles
async function fetchRelevantKBArticles(supabase: any, ticket: any) {
  const { data: articles } = await supabase
    .from('kb_articles')
    .select('*')
    .textSearch('content', ticket.description)
    .limit(5)
  
  return articles || []
}

// Node: Initial Analysis
async function analyzeTicket(state: TicketState, openai: OpenAI) {
  console.log('Analyzing ticket...')
  const analysis = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are an AI support system analyzing customer support tickets.
        You have access to relevant knowledge base articles: ${JSON.stringify(state.kbArticles)}
        
        Analyze the ticket and determine:
        1. If you can resolve it automatically (true/false)
        2. The confidence level (0-1)
        3. Detailed routing analysis:
           - Priority level (low/medium/high/urgent)
           - Category of the issue
           - Relevant tags
           - Complexity level (simple/medium/complex)
           - Required expertise areas
        
        Consider the customer's history and any relevant KB articles.
        Respond in JSON format only.`
      },
      {
        role: "user",
        content: `Ticket: ${JSON.stringify(state.ticket)}
        Customer History: ${JSON.stringify(state.customerHistory)}`
      }
    ],
    response_format: { type: "json_object" }
  })

  const content = JSON.parse(analysis.choices[0].message.content!)
  console.log('Analysis complete:', content)
  
  return {
    ...state,
    analysis: {
      canAutoResolve: content.can_resolve_automatically || false,
      confidence: content.confidence_level || 0,
      routingAnalysis: {
        priority: content.routing_analysis?.priority_level || 'medium',
        category: content.routing_analysis?.category || 'general',
        tags: content.routing_analysis?.tags || [],
        complexity: content.routing_analysis?.complexity || 'medium',
        expertise: content.routing_analysis?.expertise_areas || []
      }
    }
  }
}

// Node: Generate AI Response
async function generateResponse(state: TicketState, openai: OpenAI) {
  console.log('Generating response...')
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are a helpful customer support agent. Use these knowledge base articles as reference: ${JSON.stringify(state.kbArticles)}`
      },
      {
        role: "user",
        content: `Ticket Title: ${state.ticket.title}\nDescription: ${state.ticket.description}`
      }
    ]
  })

  console.log('Response generated')
  return {
    ...state,
    aiResponse: response.choices[0].message.content
  }
}

// Node: Route Ticket
async function routeTicket(state: TicketState, supabase: any) {
  console.log('Routing ticket...')
  const { data: rules } = await supabase.rpc('evaluate_routing_rules', {
    ticket_data: {
      priority: state.analysis.routingAnalysis.priority,
      category: state.analysis.routingAnalysis.category,
      tags: state.analysis.routingAnalysis.tags,
      complexity: state.analysis.routingAnalysis.complexity,
      expertise_needed: state.analysis.routingAnalysis.expertise
    }
  })

  console.log('Routing complete:', rules)
  return {
    ...state,
    routingRules: rules
  }
}

// Process ticket through workflow
async function processTicket(state: TicketState, openai: OpenAI, supabase: any) {
  console.log('Starting ticket processing workflow...')
  
  // Step 1: Analyze ticket
  state = await analyzeTicket(state, openai)
  
  // Step 2: Determine next action based on analysis
  if (state.analysis.canAutoResolve && state.analysis.confidence >= 0.8) {
    // Generate response and auto-resolve
    state = await generateResponse(state, openai)
  } else if (state.analysis.confidence >= 0.5) {
    // Generate response but also route to human
    state = await generateResponse(state, openai)
    state = await routeTicket(state, supabase)
  } else {
    // Route directly to human
    state = await routeTicket(state, supabase)
  }
  
  return state
}

// Edge function handler
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    console.log('Starting ticket agent processing...')
    
    // Initialize clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    console.log('Supabase client initialized')

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    })
    console.log('OpenAI client initialized')

    // Get ticket data from request
    const { ticketId } = await req.json()
    console.log('Processing ticket:', ticketId)

    if (!ticketId) {
      throw new Error('ticketId is required')
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
      console.error('Error fetching ticket:', ticketError)
      throw ticketError
    }
    console.log('Ticket fetched successfully')

    // Fetch customer history
    const { data: customerHistory } = await supabaseClient
      .from('tickets')
      .select('status, created_at')
      .eq('customer_id', ticket.customer_id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Fetch relevant KB articles
    const kbArticles = await fetchRelevantKBArticles(supabaseClient, ticket)

    // Initialize state
    const initialState: TicketState = {
      ticketId,
      ticket,
      customerHistory: customerHistory || [],
      kbArticles,
      analysis: {
        canAutoResolve: false,
        confidence: 0,
        routingAnalysis: {
          priority: 'medium',
          category: '',
          tags: [],
          complexity: 'medium',
          expertise: []
        }
      }
    }

    // Process ticket through workflow
    const result = await processTicket(initialState, openai, supabaseClient)

    // Save results
    if (result.aiResponse) {
      await supabaseClient
        .from('ticket_responses')
        .insert({
          ticket_id: ticketId,
          content: result.aiResponse,
          type: 'ai',
          metadata: { confidence: result.analysis.confidence }
        })

      if (result.analysis.canAutoResolve) {
        await supabaseClient
          .from('tickets')
          .update({ 
            status: 'resolved',
            team_id: result.suggestedTeamId 
          })
          .eq('id', ticketId)
      }
    }

    if (result.routingRules?.length > 0) {
      const rule = result.routingRules[0]
      await supabaseClient
        .from('tickets')
        .update({ 
          team_id: rule.action_target,
          status: 'open'
        })
        .eq('id', ticketId)
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Detailed error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        name: error.name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}) 