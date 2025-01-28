import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Research Library',
  description: 'Investment research and market analysis'
}

export const dynamic = 'force-dynamic'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  kb_articles: { count: number }[]
}

interface Article {
  id: string
  title: string
  slug: string
  content: string
  view_count: number
  helpful_count: number
  created_at: string
  metadata: any
  kb_categories: {
    id: string
    name: string
    slug: string
  }
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Fetch categories with article counts
  const { data: categories } = await supabase
    .from('kb_categories')
    .select(`
      id,
      name,
      slug,
      description,
      kb_articles (count)
    `)
    .order('name')

  // Build the articles query
  let articlesQuery = supabase
    .from('kb_articles')
    .select(`
      id,
      title,
      slug,
      content,
      view_count,
      helpful_count,
      created_at,
      metadata,
      kb_categories (
        id,
        name,
        slug
      )
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  // Apply category filter if selected
  if (params.category) {
    const { data: category } = await supabase
      .from('kb_categories')
      .select('id')
      .eq('slug', params.category)
      .single()

    if (category) {
      articlesQuery = articlesQuery.eq('category_id', category.id)
    }
  }

  const { data: articles } = await articlesQuery as { data: Article[] | null }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Research Library</h1>
          <p className="text-muted-foreground mt-1">Market analysis and investment insights</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Categories Sidebar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Browse by topic</CardDescription>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-20rem)]">
            <CardContent className="p-4">
              <div className="space-y-1">
                <Link
                  href="/research"
                  className={cn(
                    "block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    !params.category && "bg-accent text-accent-foreground"
                  )}
                >
                  All Research
                  <span className="text-muted-foreground ml-2">
                    ({articles?.length || 0})
                  </span>
                </Link>
                {categories?.map((category) => (
                  <Link
                    key={category.id}
                    href={`/research?category=${category.slug}`}
                    className={cn(
                      "block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      params.category === category.slug && "bg-accent text-accent-foreground"
                    )}
                  >
                    {category.name}
                    <span className="text-muted-foreground ml-2">
                      ({category.kb_articles[0]?.count || 0})
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Articles Grid */}
        <div className="md:col-span-3">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles?.map((article) => {
              const metadata = article.metadata || {}
              return (
                <Link
                  key={article.id}
                  href={`/research/${article.slug}`}
                  className="block p-6 rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors"
                >
                  <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
                  {article.kb_categories && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Category: {article.kb_categories.name}
                    </p>
                  )}
                  {metadata.investment_type?.length > 0 && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {metadata.investment_type.map((type: string) => type.replace('_', ' ')).join(', ')}
                    </p>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="mr-4">{article.view_count} views</span>
                    <span>{article.helpful_count} found helpful</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
} 