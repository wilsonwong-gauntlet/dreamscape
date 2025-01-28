import { Metadata } from 'next'
import ArticleForm from '@/components/research/ArticleForm'
import { createClient } from '@/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Create Article',
  description: 'Create a new knowledge base article'
}

export default async function NewArticlePage() {
  const supabase = await createClient()

  // Fetch categories for selection
  const { data: categories } = await supabase
    .from('kb_categories')
    .select('id, name')
    .order('name')

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">Create New Article</h1>
      
      <ArticleForm 
        categories={categories || []}
        initialData={{}}
        redirectPath="/admin/research/articles"
      />
    </div>
  )
} 