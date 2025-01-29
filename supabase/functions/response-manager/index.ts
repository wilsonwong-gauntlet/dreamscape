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
// @ts-ignore: Deno deploy imports
import { CallbackManager } from "@langchain/core/callbacks/manager"

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

    // Check if client wants streaming
    const wantsStreaming = req.headers.get("accept") === "text/event-stream";
    let responseContent = "";

    // Set up streaming if requested
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Initialize model with streaming and callbacks
    const model = new ChatOpenAI({
      modelName: "gpt-4-turbo-preview",
      temperature: 0,
      streaming: true,
      verbose: true
    });

    // Instead of using invoke, use stream method directly
    try {
      // First, search knowledge base for relevant info
      const kbResults = await kbSearchTool.invoke(content);
      console.log('[Edge] Knowledge base results:', kbResults);

      // Get customer history if available
      let customerHistory = '[]';
      if (ticket.customer?.id) {
        customerHistory = await customerHistoryTool.invoke({ customerId: ticket.customer.id });
      }
      console.log('[Edge] Customer history:', customerHistory);

      // Create the full prompt with context
      const messages = [
        new SystemMessage(`You are an AI wealth management support system responding to customer inquiries.
          
        Context:
        - Ticket Title: ${ticket.title}
        - Ticket Description: ${ticket.description}
        - Knowledge Base Results: ${kbResults}
        - Customer History: ${customerHistory}
        
        Your role:
        1. Use the provided knowledge base information and customer history
        2. Provide detailed, compliant responses
        3. Maintain professional tone
        4. Include relevant disclaimers for financial advice`),
        ...conversationHistory.map(msg => 
          msg.role === 'user' 
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
        )
      ];

      // Generate response using stream method
      if (wantsStreaming) {
        console.log('[Edge] Starting streaming generation');
        const stream = await model.stream(messages);
        
        // Create encoder for SSE
        const encoder = new TextEncoder();
        
        // Create response with streaming
        return new Response(
          new ReadableStream({
            async start(controller) {
              // Send started event
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'started' })}\n\n`));
              
              try {
                for await (const chunk of stream) {
                  if (chunk.content) {
                    const content = typeof chunk.content === 'string' 
                      ? chunk.content 
                      : Array.isArray(chunk.content)
                        ? chunk.content.map(c => typeof c === 'string' ? c : '').join('')
                        : '';
                        
                    if (content) {
                      console.log('[Edge] Streaming chunk:', content);
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                      );
                    }
                  }
                }
                
                // Send completed event
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'complete' })}\n\n`));
              } catch (error) {
                console.error('[Edge] Error in stream:', error);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`)
                );
              } finally {
                controller.close();
              }
            }
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              ...corsHeaders
            }
          }
        );
      } else {
        console.log('[Edge] Starting non-streaming generation');
        const response = await model.invoke(messages);
        responseContent = response.content;
      }

      // Create the response in database
      const { error: responseError } = await supabaseClient
        .from('ticket_responses')
        .insert({
          ticket_id: ticketId,
          content: responseContent,
          type: 'ai',
          is_internal: false,
          metadata: {
            knowledge_base: JSON.parse(kbResults),
            customer_history: JSON.parse(customerHistory),
            conversation_history: conversationHistory
          }
        });

      if (responseError) {
        console.error('[Edge] Error creating response:', responseError);
      }

      // Update ticket
      const { error: updateError } = await supabaseClient
        .from('tickets')
        .update({
          status: 'open',
          ai_response_used: true,
          ai_interaction_count: ticket.ai_interaction_count ? ticket.ai_interaction_count + 1 : 1
        })
        .eq('id', ticketId);

      if (updateError) {
        console.error('[Edge] Error updating ticket:', updateError);
      }

      if (wantsStreaming) {
        return new Response(stream.readable, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        });
      } else {
        return new Response(
          JSON.stringify({
            response: responseContent,
            status: 'success'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      console.error('[Edge] Error:', error);
      if (wantsStreaming) {
        writer.abort(error);
        return new Response(stream.readable, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream'
          }
        });
      } else {
        return new Response(
          JSON.stringify({ error: error.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
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
