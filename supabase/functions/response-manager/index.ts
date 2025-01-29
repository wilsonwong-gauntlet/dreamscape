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

// Create tools using the tool wrapper
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
        .eq('customer_id', input.customerId)
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
    schema: z.object({
      customerId: z.string().describe("The ID of the customer to fetch history for")
    })
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
  tools: [kbSearchTool, customerHistoryTool]
});

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { ticketId, content, type = 'human' } = await req.json();

    if (!ticketId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch ticket and conversation history
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select(`
        *,
        customer:customers(id, metadata),
        responses:ticket_responses(
          content,
          type,
          created_at,
          metadata
        )
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

    // Format conversation history
    const conversationHistory = ticket.responses
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((response: any) => ({
        role: response.type === 'human' ? 'user' : 'assistant',
        content: response.content
      }));

    // Add the new message
    conversationHistory.push({
      role: 'user',
      content
    });

    // Create the agent input
    const agentInput = {
      messages: [
        {
          role: "system",
          content: `You are an AI wealth management support system responding to customer inquiries.
          
          Context:
          - Ticket Title: ${ticket.title}
          - Ticket Description: ${ticket.description}
          - Customer History: Available via customer_history tool
          - Knowledge Base: Available via kb_search tool
          
          Your role:
          1. Understand the customer's query in context of the conversation history
          2. Search knowledge base for relevant information
          3. Consider customer history for context
          4. Provide detailed, compliant responses
          5. Maintain professional tone
          6. Include relevant disclaimers for financial advice
          
          After analysis, respond in JSON format:
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
          }`
        },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ]
    };

    // Execute the agent
    const result = await agent.invoke(agentInput);
    console.log('Agent result:', {
      contentLength: result.content?.length,
      messageCount: result.messages?.length
    });

    // Parse the response
    let parsedResponse;
    try {
      const lastMessage = result.messages[result.messages.length - 1];
      if (!lastMessage?.content) {
        throw new Error('No content in last message');
      }

      // Clean the content (remove code block markers if present)
      const content = lastMessage.content.replace(/^```json\n/, '').replace(/\n```$/, '');
      parsedResponse = JSON.parse(content);

      if (!parsedResponse.response || !parsedResponse.analysis) {
        throw new Error('Invalid response structure');
      }
    } catch (e) {
      console.warn('Failed to parse AI response:', e);
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

    // Create the response in the database
    const { error: responseError } = await supabaseClient
      .from('ticket_responses')
      .insert({
        ticket_id: ticketId,
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
      console.error('Error creating response:', responseError);
      throw new Error(`Failed to create response: ${responseError.message}`);
    }

    // Update ticket with latest analysis
    const { error: updateError } = await supabaseClient
      .from('tickets')
      .update({
        status: parsedResponse.analysis.can_auto_resolve ? 'resolved' : 'open',
        priority: parsedResponse.analysis.routing_analysis.priority,
        tags: parsedResponse.analysis.routing_analysis.tags,
        ai_confidence_score: parsedResponse.analysis.confidence,
        ai_response_used: true,
        ai_interaction_count: ticket.ai_interaction_count ? ticket.ai_interaction_count + 1 : 1,
        metadata: {
          ...ticket.metadata,
          last_agent_execution: {
            messages: result.messages,
            tool_calls: result.tool_calls,
            analysis: parsedResponse.analysis
          }
        }
      })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      throw new Error(`Failed to update ticket: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        response: parsedResponse.response,
        analysis: parsedResponse.analysis
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 
