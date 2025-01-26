import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ArticleForm } from '@/components/knowledge/ArticleForm'

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
    .select('title, content')
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
    title: `Edit ${article.title}`,
    description: `Edit knowledge base article: ${article.title}`,
    openGraph: {
      title: `Edit ${article.title}`,
      description: article.content.substring(0, 160),
      images: [...previousImages]
    }
  }
}

export default async function EditArticlePage({ params }: Props) {
  const slug = (await params).slug
  const supabase = await createClient()

  // Fetch article
  const { data: article } = await supabase
    .from('kb_articles')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!article) {
    notFound()
  }

  // Fetch categories for the form
  const { data: categories } = await supabase
    .from('kb_categories')
    .select('id, name, slug')
    .order('name')

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">Edit Article</h1>
      
      <ArticleForm 
        categories={categories || []}
        initialData={article}
      />
    </div>
  )
} 