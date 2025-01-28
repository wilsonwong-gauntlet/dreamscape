import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ArticleForm from '@/components/research/ArticleForm'

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
    .select('title')
    .eq('slug', slug)
    .single()

  if (!article) {
    return {
      title: 'Article Not Found'
    }
  }

  const previousImages = (await parent).openGraph?.images || []

  return {
    title: `Edit ${article.title}`,
    description: `Edit research article: ${article.title}`,
    openGraph: {
      title: `Edit ${article.title}`,
      description: `Edit research article: ${article.title}`,
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

  // Fetch categories for selection
  const { data: categories } = await supabase
    .from('kb_categories')
    .select('id, name')
    .order('name')

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">Edit Research</h1>
      
      <ArticleForm 
        categories={categories || []}
        initialData={article}
        redirectPath="/admin/research/articles"
      />
    </div>
  )
} 