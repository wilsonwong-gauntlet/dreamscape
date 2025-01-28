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
        .select('*')
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
          - Handle errors gracefully with clear explanations`
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
      messageCount: result.messages?.length
    });

    // Update ticket in database
    await supabaseClient
      .from('tickets')
      .update({
        status: 'processed',
        ai_response: result.content,
        metadata: {
          ...ticket.metadata,
          agent_execution: {
            messages: result.messages,
            content: result.content
          }
        }
      })
      .eq('id', ticket.id);

    return new Response(
      JSON.stringify({
        response: result.content,
        execution: {
          messages: result.messages,
          content: result.content
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
