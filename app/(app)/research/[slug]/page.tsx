import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import ArticleFeedback from '@/components/research/ArticleFeedback'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const slug = (await params).slug
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('kb_articles')
    .select(`
      title,
      content,
      kb_categories (
        name
      )
    `)
    .eq('slug', slug)
    .single()

  if (!article) {
    return {
      title: 'Article Not Found'
    }
  }

  // Optionally access and extend parent metadata
  const previousImages = (await parent).openGraph?.images || []

  return {
    title: article.title,
    description: article.content.substring(0, 160),
    openGraph: {
      title: article.title,
      description: article.content.substring(0, 160),
      type: 'article',
      images: [...previousImages]
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.content.substring(0, 160)
    }
  }
}

export default async function ArticlePage({ params }: Props) {
  const slug = (await params).slug
  const supabase = await createClient()

  // Fetch article with category info
  const { data: article } = await supabase
    .from('kb_articles')
    .select(`
      *,
      kb_categories (
        name,
        slug
      )
    `)
    .eq('slug', slug)
    .single()

  if (!article) {
    notFound()
  }

  // Increment view count
  await supabase.rpc('increment_article_views', {
    article_id: article.id
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        {article.kb_categories && (
          <Link 
            href={`/research/categories/${article.kb_categories.slug}`}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {article.kb_categories.name}
          </Link>
        )}
        <h1 className="text-3xl font-bold mt-2">{article.title}</h1>
      </div>

      <div className="prose prose-slate max-w-none">
        {article.content}
      </div>

      <div className="mt-8 pt-8 border-t">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="mr-4">{article.view_count} views</span>
            <span>{article.helpful_count} found helpful</span>
          </div>
          <ArticleFeedback articleId={article.id} />
        </div>
      </div>
    </div>
  )
} 