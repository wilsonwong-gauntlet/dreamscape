// @ts-ignore: Deno deploy imports
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore: Deno deploy imports
import { createClient } from 'jsr:@supabase/supabase-js@2'
// @ts-ignore: Deno deploy imports
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts"

// Add Deno types
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

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
        priority: content.detailed_routing_analysis?.priority_level || 'medium',
        category: content.detailed_routing_analysis?.category_of_the_issue || 'general',
        tags: content.detailed_routing_analysis?.relevant_tags || [],
        complexity: content.detailed_routing_analysis?.complexity_level || 'medium',
        expertise: content.detailed_routing_analysis?.required_expertise_areas || []
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
  console.log('Routing ticket...', { ticketId: state.ticketId })
  
  // Prepare ticket data in the format expected by evaluate_routing_rules
  const ticketData = {
    priority: state.analysis.routingAnalysis.priority,
    category: state.analysis.routingAnalysis.category,
    tags: state.analysis.routingAnalysis.tags || [],
    complexity: state.analysis.routingAnalysis.complexity,
    expertise_needed: state.analysis.routingAnalysis.expertise || [],
    // Include additional fields that might be used in routing rules
    source: state.ticket.source,
    customer_id: state.ticket.customer_id,
    title: state.ticket.title,
    description: state.ticket.description,
    metadata: state.ticket.metadata || {},
    custom_fields: state.ticket.custom_fields || {}
  }

  // Log the AI analysis for comparison
  console.log('Original AI analysis:', JSON.stringify(state.analysis.routingAnalysis, null, 2))
  console.log('Ticket data prepared for routing:', JSON.stringify(ticketData, null, 2))

  // Verify routing rules exist before evaluation
  const { data: existingRules, error: rulesError } = await supabase
    .from('routing_rules')
    .select('*')
      .eq('is_active', true)
    .order('priority', { ascending: true })

  if (rulesError) {
    console.error('Error fetching routing rules:', rulesError)
    return state
  }

  console.log('Active routing rules found:', existingRules?.length || 0)
  
  // Evaluate routing rules
  console.log('Calling evaluate_routing_rules with ticket data...')
  const { data: rules, error } = await supabase.rpc('evaluate_routing_rules', {
    ticket_data: ticketData
  })

  if (error) {
    console.error('Error evaluating routing rules:', {
      error,
      errorMessage: error.message,
      errorDetails: error.details,
      hint: error.hint
    })
    return state
  }

  console.log('Routing rules evaluation complete:', {
    rulesFound: rules ? rules.length : 0,
    rules: JSON.stringify(rules, null, 2)
  })

  // Verify the action target exists
  if (rules?.[0]) {
    const rule = rules[0]
    console.log('Applying rule:', {
      ruleId: rule.rule_id,
      action: rule.action,
      actionTarget: rule.action_target
    })

    if (rule.action === 'assign_team') {
      const { data: team } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', rule.action_target)
        .single()
      
      console.log('Team verification:', {
        targetTeamId: rule.action_target,
        teamFound: !!team,
        teamDetails: team
      })
    } else if (rule.action === 'assign_agent') {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, name, team_id')
        .eq('id', rule.action_target)
        .single()
      
      console.log('Agent verification:', {
        targetAgentId: rule.action_target,
        agentFound: !!agent,
        agentDetails: agent
      })
    }
  }

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
  console.log('Analysis result:', state.analysis)

  // Step 2: Determine path based on analysis
  if (state.analysis.canAutoResolve && state.analysis.confidence >= 0.8) {
    // High confidence auto-resolve
    console.log('High confidence auto-resolve path')
    state = await generateResponse(state, openai)
    
    // Set AI team
    state.suggestedTeamId = 'c4b5b62b-df0c-44f7-9fa8-6aad40e7dfcb' // AI team ID
  } else {
    // Medium or low confidence - evaluate routing rules
    console.log('Evaluating routing rules')
    
    // Route ticket first
    state = await routeTicket(state, supabase)
    
    // For medium confidence, generate AI response after routing
    if (state.analysis.confidence >= 0.5) {
      console.log('Medium confidence - generating response')
      state = await generateResponse(state, openai)
    }
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

    // Save results based on confidence level
    if (result.analysis.canAutoResolve && result.analysis.confidence >= 0.8) {
      // High confidence - Auto resolve
      console.log('Saving auto-resolve results')
      
      // Save AI response
      await supabaseClient
        .from('ticket_responses')
        .insert({
          ticket_id: ticketId,
          content: result.aiResponse,
          type: 'ai',
          metadata: { confidence: result.analysis.confidence }
        })

      // Update ticket status and assign to AI team
      await supabaseClient
        .from('tickets')
        .update({ 
          status: 'resolved',
          team_id: result.suggestedTeamId
        })
        .eq('id', ticketId)

      // Add to ticket history
      await supabaseClient
        .from('ticket_history')
        .insert({
          ticket_id: ticketId,
          action: 'auto_resolve',
          actor_id: null,
          changes: {
            status: 'resolved',
            team_id: result.suggestedTeamId,
            confidence: result.analysis.confidence
          }
        })

    } else {
      // Medium or low confidence
      const updates: Record<string, any> = {}
      
      // Save AI response for medium confidence
      if (result.analysis.confidence >= 0.5 && result.aiResponse) {
        console.log('Saving AI response for human review')
        await supabaseClient
          .from('ticket_responses')
          .insert({
            ticket_id: ticketId,
            content: result.aiResponse,
            type: 'ai',
            metadata: { confidence: result.analysis.confidence }
          })
        
        updates.status = 'pending' // Needs human review
      } else {
        updates.status = 'open' // Needs full human attention
      }

      // Apply routing result if available
      if (result.routingRules?.[0]) {
        const rule = result.routingRules[0]
        if (rule.action === 'assign_team') {
          updates.team_id = rule.action_target
        } else if (rule.action === 'assign_agent') {
          updates.assigned_agent_id = rule.action_target
        }
      }

      // Update ticket
      await supabaseClient
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)

      // Add to ticket history
      await supabaseClient
        .from('ticket_history')
        .insert({
          ticket_id: ticketId,
          action: result.analysis.confidence >= 0.5 ? 'ai_assist' : 'route',
          actor_id: null,
          changes: {
            ...updates,
            confidence: result.analysis.confidence,
            rule_id: result.routingRules?.[0]?.rule_id
          }
        })
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