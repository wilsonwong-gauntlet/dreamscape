// @ts-ignore: Deno deploy imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno deploy imports
import { createClient } from "@supabase/supabase-js"
// @ts-ignore: Deno deploy imports
import { OpenAI } from "openai"
// @ts-ignore: Deno deploy imports
import { tool } from "@langchain/core/tools"
// @ts-ignore: Deno deploy imports
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
// @ts-ignore: Deno deploy imports
import { ChatOpenAI } from "@langchain/openai"
// @ts-ignore: Deno deploy imports
import { createReactAgent } from "@langchain/langgraph/prebuilt"
// @ts-ignore: Deno deploy imports
import { z } from "zod"

// Add Deno types
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
});

// Define schemas for tools
const portfolioOrderSchema = z.object({
  portfolioId: z.string().describe("The ID of the portfolio to execute the trade on"),
  symbol: z.string().describe("The stock symbol/ticker to trade"),
  quantity: z.number().describe("Number of shares to buy/sell"),
  price: z.number().describe("Price per share for the order"),
  transactionType: z.enum(["buy", "sell"]).describe("Type of transaction to execute"),
  access_token: z.string().describe("Access token for authorization")
});

const customerHistorySchema = z.object({
  userId: z.string().describe("The ID of the customer to fetch history for")
});

// Create tools using the tool wrapper
const portfolioHoldingsTool = tool(
  async (input) => {
    try {
      const response = await fetch(`${Deno.env.get('APP_URL')}/api/portfolio/holdings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${input.access_token}`
        },
        body: JSON.stringify(input)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process trade order');
      }
      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "portfolio_holdings",
    description: "Execute buy/sell orders for portfolio holdings. Use this for processing trade requests.",
    schema: portfolioOrderSchema
  }
);

const kbSearchTool = tool(
  async (input: string) => {
    try {
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input
      });
      
      const { data: articles, error } = await supabaseClient
        .rpc('match_documents', {
          query_embedding: embedding.data[0].embedding,
          match_count: 3
        });
      
      if (error) throw error;
      return JSON.stringify(articles || []);
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "kb_search",
    description: "Search knowledge base articles for relevant information about wealth management topics.",
    schema: z.string().describe("The search query to find relevant articles")
  }
);

const customerHistoryTool = tool(
  async (input) => {
    try {
      const { data: history, error } = await supabaseClient
        .from('tickets')
        .select('status, created_at')
        .eq('userId', input.userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return JSON.stringify(history || []);
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "customer_history",
    description: "Fetch customer's previous support tickets and interactions.",
    schema: customerHistorySchema
  }
);

// Initialize model with streaming
const model = new ChatOpenAI({
  modelName: "gpt-4-turbo-preview",
  temperature: 0,
  streaming: true
});

// Create the React Agent with the tool-enabled model
const agent = createReactAgent({
  llm: model,
  tools: [portfolioHoldingsTool, kbSearchTool, customerHistoryTool]
});

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Log the raw request
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);

    // Parse JSON and log
    let payload;
    try {
      payload = JSON.parse(rawBody);
      console.log('Parsed payload:', payload);
    } catch (e) {
      console.error('Failed to parse request JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate ticket object
    const { ticketId } = payload;
    if (!ticketId) {
      console.error('No ticketId found in payload:', payload);
      return new Response(
        JSON.stringify({ error: 'Missing ticketId in request' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch ticket from database
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select(`
        *,
        customer:customers(id, metadata),
        assigned_agent:agents(id, team_id, role),
        team:teams(id, name)
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error('Failed to fetch ticket:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch customer history
    const { data: customerHistory } = await supabaseClient
      .from('tickets')
      .select('status, created_at')
      .eq('customer_id', ticket.customer_id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Log ticket details
    console.log('Processing ticket:', {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      customer_id: ticket.customer_id,
      customer_email: ticket.customer?.email
    });

    // Create the agent input with proper message format
    const agentInput = {
      messages: [
        {
          role: "system",
          content: `You are an AI wealth management support system.
          Your role is to handle client requests including:
          - Portfolio review and rebalancing
          - Buy/sell stock orders
          - Investment strategy consultation
          - Account management
          - Financial planning
          - Risk assessment

          For trading requests:
          1. Validate order details (symbol, quantity, price)
          2. Check customer history for context using customer_history tool
          3. Execute trades using portfolio_holdings tool
          4. Provide clear confirmation or error handling

          For other requests:
          1. Search knowledge base using kb_search tool for relevant information
          2. Consider customer history and context
          3. Provide detailed, compliant responses
          4. Escalate complex cases to appropriate teams

          Always:
          - Maintain professional tone and regulatory compliance
          - Validate all trade details before execution
          - Include relevant disclaimers for financial advice
          - Format responses clearly for client communication
          - Handle errors gracefully with clear explanations

          After using any tools, evaluate:
          - How directly the tool results answer the question (0-1)
          - How reliable/authoritative the information is (0-1)
          - Whether human expertise is needed to interpret or validate
          - Whether additional context or clarification is needed

          Your response should be in JSON format with the following structure:
          {
            "response": "your detailed response to the customer",
            "analysis": {
              "can_auto_resolve": boolean,
              "confidence": number (0-1),
              "tool_evaluation": {
                "relevance": number (0-1),
                "reliability": number (0-1),
                "needs_human_review": boolean,
                "needs_clarification": boolean
              },
              "routing_analysis": {
                "priority": "low" | "medium" | "high" | "urgent",
                "category": string,
                "tags": string[],
                "complexity": "simple" | "medium" | "complex",
                "expertise": string[]
              }
            }
          }

          Set confidence based on:
          - For knowledge base queries: combine relevance and reliability scores
          - For trade executions: certainty of order details and validation
          - For complex requests: lower confidence if human expertise needed
          - Overall: lower confidence if clarification needed`
        },
        {
          role: "user",
          content: JSON.stringify({
            title: ticket.title,
            description: ticket.description,
            metadata: ticket.metadata,
            userId: ticket.customer_id,
            access_token: ticket.access_token
          })
        }
      ]
    };

    // Log agent input
    console.log('Agent input:', {
      title: ticket.title,
      description: ticket.description?.substring(0, 100) + '...',
      userId: ticket.customer_id
    });

    // Execute the agent
    const result = await agent.invoke(agentInput);
    console.log('Agent result:', {
      contentLength: result.content?.length,
      messageCount: result.messages?.length,
      fullResult: JSON.stringify(result)
    });

    // Parse the response and analysis
    let parsedResponse;
    try {
      // Find the last message that contains a JSON response
      const lastMessage = result.messages[result.messages.length - 1];
      if (!lastMessage?.content) {
        throw new Error('No content in last message');
      }

      // Clean the content (remove code block markers if present)
      const content = lastMessage.content.replace(/^```json\n/, '').replace(/\n```$/, '');
      
      // Parse the JSON
      parsedResponse = JSON.parse(content);

      // Validate the parsed response structure
      if (!parsedResponse.response || !parsedResponse.analysis) {
        throw new Error('Invalid response structure');
      }
    } catch (e) {
      console.warn('Failed to parse AI response:', e);
      console.warn('Last message content:', result.messages[result.messages.length - 1]?.content);
      parsedResponse = {
        response: "Failed to generate response",
        analysis: {
          can_auto_resolve: false,
          confidence: 0.0,
          routing_analysis: {
            priority: 'medium',
            category: 'general',
            tags: [],
            complexity: 'medium',
            expertise: []
          }
        }
      };
    }

    // Determine ticket status based on analysis
    const newStatus = parsedResponse.analysis.can_auto_resolve && parsedResponse.analysis.confidence > 0.8
      ? 'resolved'
      : parsedResponse.analysis.confidence > 0.5
        ? 'open'
        : 'pending';

    // Update ticket in database with enhanced routing information
    const { error: updateError } = await supabaseClient
      .from('tickets')
      .update({
        status: newStatus,
        priority: parsedResponse.analysis.routing_analysis.priority,
        tags: parsedResponse.analysis.routing_analysis.tags,
        ai_confidence_score: parsedResponse.analysis.confidence,
        ai_response_used: true,
        ai_interaction_count: ticket.ai_interaction_count ? ticket.ai_interaction_count + 1 : 1,
        metadata: {
          ...ticket.metadata,
          agent_execution: {
            messages: result.messages,
            content: parsedResponse.response,
            tool_calls: result.tool_calls,
            analysis: parsedResponse.analysis,
            last_evaluation: {
              relevance: parsedResponse.analysis.tool_evaluation?.relevance || 0,
              reliability: parsedResponse.analysis.tool_evaluation?.reliability || 0,
              needs_human_review: parsedResponse.analysis.tool_evaluation?.needs_human_review || false,
              needs_clarification: parsedResponse.analysis.tool_evaluation?.needs_clarification || false,
              confidence: parsedResponse.analysis.confidence,
              can_auto_resolve: parsedResponse.analysis.can_auto_resolve
            },
            routing: {
              category: parsedResponse.analysis.routing_analysis.category,
              tags: parsedResponse.analysis.routing_analysis.tags,
              complexity: parsedResponse.analysis.routing_analysis.complexity,
              expertise: parsedResponse.analysis.routing_analysis.expertise,
              priority: parsedResponse.analysis.routing_analysis.priority
            }
          }
        }
      })
      .eq('id', ticket.id);

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      throw new Error(`Failed to update ticket: ${updateError.message}`);
    }

    // Create ticket response with enhanced metadata
    const { error: responseError } = await supabaseClient
      .from('ticket_responses')
      .insert({
        ticket_id: ticket.id,
        content: parsedResponse.response,
        type: 'ai',
        is_internal: false,
        metadata: {
          agent_execution: {
            messages: result.messages,
            tool_calls: result.tool_calls,
            analysis: parsedResponse.analysis,
            routing: {
              category: parsedResponse.analysis.routing_analysis.category,
              tags: parsedResponse.analysis.routing_analysis.tags,
              complexity: parsedResponse.analysis.routing_analysis.complexity,
              expertise: parsedResponse.analysis.routing_analysis.expertise,
              priority: parsedResponse.analysis.routing_analysis.priority
            }
          }
        }
      });

    if (responseError) {
      console.error('Error creating ticket response:', responseError);
      throw new Error(`Failed to create ticket response: ${responseError.message}`);
    }

    return new Response(
      JSON.stringify({
        response: parsedResponse.response,
        status: newStatus,
        analysis: parsedResponse.analysis,
        routing: {
          category: parsedResponse.analysis.routing_analysis.category,
          tags: parsedResponse.analysis.routing_analysis.tags,
          complexity: parsedResponse.analysis.routing_analysis.complexity,
          expertise: parsedResponse.analysis.routing_analysis.expertise,
          priority: parsedResponse.analysis.routing_analysis.priority
        },
        execution: {
          messages: result.messages,
          tool_calls: result.tool_calls
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error processing request:', {
      error: error.message,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.constructor.name
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 
