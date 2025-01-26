import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

interface Article {
  id: string
  title: string
  slug: string
  view_count: number
  helpful_count: number
  created_at: string
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  kb_articles: Article[]
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const slug = (await params).slug
  const supabase = await createClient()
  
  const { data: category } = await supabase
    .from('kb_categories')
    .select('name, description')
    .eq('slug', slug)
    .single()

  if (!category) {
    return {
      title: 'Category Not Found'
    }
  }

  const previousImages = (await parent).openGraph?.images || []

  return {
    title: category.name,
    description: category.description || `Articles in ${category.name}`,
    openGraph: {
      title: category.name,
      description: category.description || `Articles in ${category.name}`,
      images: [...previousImages]
    }
  }
}

export default async function CategoryPage({ params }: Props) {
  const slug = (await params).slug
  const supabase = await createClient()

  // Fetch category with its articles
  const { data: category } = await supabase
    .from('kb_categories')
    .select<any, Category>(`
      *,
      kb_articles (
        id,
        title,
        slug,
        view_count,
        helpful_count,
        created_at
      )
    `)
    .eq('slug', slug)
    .eq('kb_articles.status', 'published')
    .single()

  if (!category) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mb-8">{category.description}</p>
        )}

        <div className="grid gap-6">
          {category.kb_articles.map((article: Article) => (
            <Link 
              key={article.id}
              href={`/knowledge/${article.slug}`}
              className="block p-6 rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors"
            >
              <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="mr-4">{article.view_count} views</span>
                <span>{article.helpful_count} found helpful</span>
              </div>
            </Link>
          ))}

          {category.kb_articles.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No articles in this category yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
} 