import { createClient } from '@/utils/supabase/server';
import { searchSimilarDocuments } from '@/utils/langchain';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { query, limit = 5, minSimilarity = 0.5 } = await req.json();
  
  try {
    // Search for similar articles using LangChain
    const articles = await searchSimilarDocuments(query, limit, minSimilarity);
    
    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' }, 
      { status: 500 }
    );
  }
} 