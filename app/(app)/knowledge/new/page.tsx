import { Metadata, ResolvingMetadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { ArticleForm } from '@/components/knowledge/ArticleForm'

type Props = {
  params: Promise<{}>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  _props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Optionally access and extend parent metadata
  const previousImages = (await parent).openGraph?.images || []

  return {
    title: 'Create Article',
    description: 'Create a new knowledge base article',
    openGraph: {
      title: 'Create Article',
      description: 'Create a new knowledge base article',
      images: [...previousImages]
    }
  }
}

export default async function NewArticlePage() {
  const supabase = await createClient()

  // Fetch categories for the form
  const { data: categories } = await supabase
    .from('kb_categories')
    .select('id, name, slug')
    .order('name')

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">Create New Article</h1>
      
      <ArticleForm 
        categories={categories || []}
        initialData={{
          title: '',
          content: '',
          category_id: null,
          status: 'draft'
        }}
      />
    </div>
  )
} 