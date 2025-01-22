import OpenAI from 'openai'
import type { Ticket } from '@/types/database'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface AIProcessingResult {
  canAutoResolve: boolean
  response?: string
  confidence: number
  suggestedTeamId?: string
}

interface AIAnalysisResponse {
  canAutoResolve: boolean
  confidence: number
  suggestedTeamId?: string
}

export async function processTicketWithAI(ticket: Ticket): Promise<AIProcessingResult> {
  try {
    // 1. Analyze ticket content
    const analysis = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an AI support system analyzing customer support tickets. 
          Analyze the ticket and determine:
          1. If you can resolve it automatically
          2. The confidence level (0-1)
          3. If it needs human attention, which team should handle it
          
          Respond in JSON format only.`
        },
        {
          role: "user",
          content: `Ticket Title: ${ticket.title}\nDescription: ${ticket.description}`
        }
      ],
      response_format: { type: "json_object" }
    })

    const content = analysis.choices[0].message.content
    if (!content) throw new Error('No content in AI response')
    
    const result = JSON.parse(content) as AIAnalysisResponse

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
      if (!responseContent) throw new Error('No content in AI response')

      return {
        canAutoResolve: true,
        response: responseContent,
        confidence: result.confidence
      }
    }

    // 3. If needs human attention, return routing suggestion
    return {
      canAutoResolve: false,
      confidence: result.confidence,
      suggestedTeamId: result.suggestedTeamId
    }

  } catch (error) {
    console.error('Error processing ticket with AI:', error)
    // If AI processing fails, route to human
    return {
      canAutoResolve: false,
      confidence: 0,
      suggestedTeamId: process.env.DEFAULT_SUPPORT_TEAM_ID
    }
  }
} 