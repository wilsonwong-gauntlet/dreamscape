// @ts-ignore: Deno deploy imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno deploy imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// @ts-ignore: Deno deploy imports
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts"
// @ts-ignore: Deno deploy imports
import { Langfuse } from 'npm:langfuse'

// Add Deno types
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// Initialize Langfuse
const langfuse = new Langfuse({
  publicKey: Deno.env.get('LANGFUSE_PUBLIC_KEY') ?? '',
  secretKey: Deno.env.get('LANGFUSE_SECRET_KEY') ?? '',
  baseUrl: Deno.env.get('LANGFUSE_BASE_URL') ?? 'https://cloud.langfuse.com'
})

// Add error handling
langfuse.on("error", (error) => {
  console.error("Langfuse error:", error)
})

// Enable debug mode in development
if (Deno.env.get('ENVIRONMENT') === 'development') {
  langfuse.debug()
}

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

interface TeamRouting {
  type: 'team'
  id: string
  name: string
}

interface AgentRouting {
  type: 'agent'
  id: string
  name: string
  teamId: string
}

type RoutingResult = TeamRouting | AgentRouting | null

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// Tool for fetching relevant KB articles
async function fetchRelevantKBArticles(supabase: any, ticket: any) {
  try {
    // Generate embedding for ticket description
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    });
    
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: `${ticket.title}\n\n${ticket.description}`
    });
    
    // Search for similar articles using vector similarity
    const { data: articles, error } = await supabaseClient
      .rpc('match_documents', {
        query_embedding: embedding.data[0].embedding,
        match_count: 5,
        filter: { status: 'published' }
      });
    
    if (error) {
      console.error('Error fetching KB articles:', error);
      return [];
    }
    
    // Transform results to match expected format
    return articles.map(article => ({
      id: article.id,
      title: article.metadata.title,
      content: article.content,
      metadata: article.metadata,
      similarity: article.similarity
    })) || [];
  } catch (error) {
    console.error('Error fetching KB articles:', error);
    return [];
  }
}

// Node: Initial Analysis
async function analyzeTicket(state: TicketState, openai: OpenAI, trace: any) {
  console.log('Analyzing ticket...')
  
  const generation = trace.generation({
    name: 'Analyze Ticket',
    model: "gpt-4-turbo-preview",
    modelParameters: {
      temperature: 0,
      response_format: { type: "json_object" }
    },
    input: {
      ticket: state.ticket,
      customerHistory: state.customerHistory,
      kbArticles: state.kbArticles
    }
  })

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
  
  generation.end({
    output: content,
    usage: {
      prompt_tokens: analysis.usage?.prompt_tokens,
      completion_tokens: analysis.usage?.completion_tokens,
      total_tokens: analysis.usage?.total_tokens
    }
  })
  
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
async function generateResponse(state: TicketState, openai: OpenAI, trace: any) {
  console.log('Generating response...')
  
  const generation = trace.generation({
    name: 'Generate Response',
    model: "gpt-4-turbo-preview",
    modelParameters: {
      temperature: 0
    },
    input: {
      ticket: state.ticket,
      analysis: state.analysis,
      kbArticles: state.kbArticles
    }
  })

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

  const content = response.choices[0].message.content!
  
  generation.end({
    output: content,
    usage: {
      prompt_tokens: response.usage?.prompt_tokens,
      completion_tokens: response.usage?.completion_tokens,
      total_tokens: response.usage?.total_tokens
    }
  })

  return {
    ...state,
    aiResponse: content
  }
}

// Node: Route Ticket
async function routeTicket(state: TicketState, supabase: any, trace: any) {
  console.log('Routing ticket...', { ticketId: state.ticketId })
  
  const span = trace.span({
    name: 'Route Ticket',
    input: {
      ticketId: state.ticketId,
      analysis: state.analysis.routingAnalysis
    }
  })
  
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

  try {
    // Create event for fetching rules
    span.event({
      name: 'Fetch Rules',
      input: { is_active: true }
    })

    // Verify routing rules exist before evaluation
    const { data: existingRules, error: rulesError } = await supabase
      .from('routing_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (rulesError) {
      console.error('Error fetching routing rules:', rulesError)
      span.event({
        name: 'Rules Fetch Error',
        output: { error: rulesError }
      })
      span.end({
        output: { error: rulesError },
        level: 'ERROR'
      })
      return state
    }

    span.event({
      name: 'Rules Fetched',
      output: { rulesCount: existingRules?.length || 0 }
    })

    console.log('Active routing rules found:', existingRules?.length || 0)
    
    // Create event for rule evaluation
    span.event({
      name: 'Evaluate Rules',
      input: ticketData
    })
    
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
      span.event({
        name: 'Rules Evaluation Error',
        output: { error }
      })
      span.end({
        output: { error },
        level: 'ERROR'
      })
      return state
    }

    span.event({
      name: 'Rules Evaluated',
      output: {
        matchedRules: rules?.length || 0,
        rules
      }
    })

    console.log('Routing rules evaluation complete:', {
      rulesFound: rules ? rules.length : 0,
      rules: JSON.stringify(rules, null, 2)
    })

    let routingResult: RoutingResult = null
    
    // Create event for target verification
    span.event({
      name: 'Verify Target',
      input: rules?.[0] ? {
        ruleId: rules[0].rule_id,
        action: rules[0].action,
        actionTarget: rules[0].action_target
      } : null
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
        
        if (team) {
          routingResult = {
            type: 'team',
            id: team.id,
            name: team.name
          }
        }
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
        
        if (agent) {
          routingResult = {
            type: 'agent',
            id: agent.id,
            name: agent.name,
            teamId: agent.team_id
          }
        }
      }
    }

    span.event({
      name: 'Target Verified',
      output: { routingResult }
    })

    span.end({
      output: {
        activeRules: existingRules?.length || 0,
        matchedRules: rules?.length || 0,
        appliedRule: rules?.[0] || null,
        routingResult
      },
      level: routingResult ? 'DEFAULT' : 'WARNING'
    })

    return {
      ...state,
      routingRules: rules
    }
  } catch (error) {
    span.event({
      name: 'Routing Error',
      output: {
        error: error.message,
        code: error.code
      }
    })
    span.end({
      error: {
        message: error.message,
        code: error.code
      },
      level: 'ERROR'
    })
    throw error
  }
}

// Process ticket through workflow
async function processTicket(state: TicketState, openai: OpenAI, supabase: any) {
  // Create a new trace for this ticket processing
  const trace = langfuse.trace({
    id: `ticket-${state.ticketId}`,
    name: 'Ticket Processing',
    metadata: {
      ticketId: state.ticketId,
      title: state.ticket.title,
      source: state.ticket.source,
      customerHistory: state.customerHistory?.length || 0,
      hasKbArticles: state.kbArticles?.length > 0
    },
    tags: ['ticket-processing', state.ticket.source || 'unknown']
  })

  try {
    console.log('Starting ticket processing workflow...')
    
    // Step 1: Analyze ticket
    state = await analyzeTicket(state, openai, trace)
    console.log('Analysis result:', state.analysis)

    // Add score for analysis quality
    trace.score({
      name: 'analysis_confidence',
      value: state.analysis.confidence,
      comment: `Analysis confidence for ticket ${state.ticketId}`
    })

    // Step 2: Determine path based on analysis
    if (state.analysis.canAutoResolve && state.analysis.confidence >= 0.8) {
      // High confidence auto-resolve
      console.log('High confidence auto-resolve path')
      state = await generateResponse(state, openai, trace)
      
      // Set AI team
      state.suggestedTeamId = 'c4b5b62b-df0c-44f7-9fa8-6aad40e7dfcb' // AI team ID

      // Add score for auto-resolution
      trace.score({
        name: 'auto_resolution',
        value: 1.0,
        comment: `Successfully auto-resolved ticket ${state.ticketId}`
      })

      // Update trace metadata
      trace.update({
        metadata: {
          resolution: 'auto_resolved',
          confidence: state.analysis.confidence,
          teamId: state.suggestedTeamId
        }
      })
    } else {
      // Medium or low confidence - evaluate routing rules
      console.log('Evaluating routing rules')
      
      // Route ticket first
      state = await routeTicket(state, supabase, trace)
      
      const hasValidRouting = state.routingRules && state.routingRules.length > 0
      
      // Add score for routing success
      trace.score({
        name: 'routing_success',
        value: hasValidRouting ? 1.0 : 0.0,
        comment: hasValidRouting 
          ? `Successfully routed ticket ${state.ticketId} using rules` 
          : `Failed to find matching rules for ticket ${state.ticketId}`
      })
      
      // For medium confidence, generate AI response after routing
      if (state.analysis.confidence >= 0.5) {
        console.log('Medium confidence - generating response')
        state = await generateResponse(state, openai, trace)

        // Add score for AI assistance
        trace.score({
          name: 'ai_assistance',
          value: 0.5,
          comment: `Generated AI response for human review on ticket ${state.ticketId}`
        })

        // Update trace metadata
        trace.update({
          metadata: {
            resolution: 'ai_assisted',
            confidence: state.analysis.confidence,
            teamId: state.suggestedTeamId,
            routingRuleId: state.routingRules?.[0]?.rule_id
          }
        })
      } else {
        // Update trace for human-only resolution
        trace.update({
          metadata: {
            resolution: 'human_only',
            confidence: state.analysis.confidence,
            teamId: state.suggestedTeamId,
            routingRuleId: state.routingRules?.[0]?.rule_id
          }
        })
      }
    }
    
    return state
  } catch (error) {
    // Update trace with error state
    trace.update({
      metadata: {
        error: error.message,
        errorCode: error.code,
        status: 'error'
      },
      tags: [...(trace.tags || []), 'error']
    })
    throw error
  } finally {
    // Ensure all events are flushed in serverless environment
    await langfuse.shutdownAsync()
  }
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