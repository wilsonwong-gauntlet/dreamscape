import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
});

// Initialize Supabase client for vector store
const vectorStoreClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize vector store
export const vectorStore = new SupabaseVectorStore(embeddings, {
  client: vectorStoreClient,
  tableName: "documents",
  queryName: "match_documents"
});

// Helper function to add documents to vector store
export async function addDocumentToVectorStore(document: { 
  title: string; 
  content: string;
  metadata?: Record<string, any>;
}) {
  const text = `${document.title}\n\n${document.content}`;
  return vectorStore.addDocuments([
    {
      pageContent: text,
      metadata: {
        title: document.title,
        ...document.metadata || {}
      }
    }
  ]);
}

// Helper function to search documents
export async function searchSimilarDocuments(
  query: string,
  limit: number = 5,
  minSimilarity: number = 0.5
) {
  // First generate embedding for the query
  const queryEmbedding = await embeddings.embedQuery(query);
  
  // Then search using the embedding
  const results = await vectorStore.similaritySearchVectorWithScore(
    queryEmbedding,
    limit,
    { status: 'published' }
  );
  
  // Transform results to a more usable format
  return results.map(([doc, score]) => ({
    id: doc.metadata.id,
    title: doc.metadata.title,
    content: doc.pageContent,
    metadata: doc.metadata,
    similarity: score
  }))
  .filter(result => result.similarity >= minSimilarity);
} 

