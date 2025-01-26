import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI()

// Function to generate embeddings for text
async function generateEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  })
  return response.data[0].embedding
}

// Search endpoint
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const context = searchParams.get('context') // Additional context from ticket
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    // Generate embedding for search query
    const searchText = context ? `${query} ${context}` : query
    const queryEmbedding = await generateEmbedding(searchText)

    const supabase = await createClient()

    // Perform vector similarity search
    const { data: articles, error } = await supabase.rpc(
      'match_articles',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.7, // Similarity threshold
        match_count: 5, // Number of articles to return
      }
    )

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      )
    }

    // Enhance results with relevance info
    const enhancedResults = articles.map(article => ({
      ...article,
      relevance_score: article.similarity,
      matched_metadata: {
        problem_types: article.metadata.problem_types,
        applies_to: article.metadata.applies_to,
      }
    }))

    return NextResponse.json({
      results: enhancedResults,
      query_context: {
        original_query: query,
        enhanced_context: context,
        embedding_dimensions: queryEmbedding.length
      }
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 