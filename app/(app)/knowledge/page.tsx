import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Knowledge Base',
  description: 'Browse our knowledge base articles and documentation'
}

export const dynamic = 'force-dynamic'

export default async function KnowledgeBasePage() {
  const supabase = await createClient()

  const { data: articles } = await supabase
    .from('kb_articles')
    .select(`
      id,
      title,
      slug,
      category_id,
      kb_categories (
        name,
        slug
      ),
      view_count,
      helpful_count,
      created_at
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <Link 
          href="/knowledge/new" 
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
        >
          Create Article
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles?.map((article) => (
          <Link 
            key={article.id} 
            href={`/knowledge/${article.slug}`}
            className="block p-6 rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
            {article.kb_categories && (
              <p className="text-sm text-muted-foreground mb-4">
                in {article.kb_categories.name}
              </p>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="mr-4">{article.view_count} views</span>
              <span>{article.helpful_count} found helpful</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 