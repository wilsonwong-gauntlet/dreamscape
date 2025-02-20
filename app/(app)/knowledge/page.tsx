import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Research Library',
  description: 'Investment research and market analysis'
}

export const dynamic = 'force-dynamic'

export default async function ResearchPage() {
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
        <div>
          <h1 className="text-2xl font-bold">Research Library</h1>
          <p className="text-muted-foreground mt-1">Market analysis and investment insights</p>
        </div>
        <Link 
          href="/research/new" 
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
        >
          New Research
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles?.map((article) => (
          <Link 
            key={article.id} 
            href={`/research/${article.slug}`}
            className="block p-6 rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
            {article.kb_categories && article.kb_categories.length > 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                Category: {article.kb_categories.map(category => category.name).join(', ')}
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