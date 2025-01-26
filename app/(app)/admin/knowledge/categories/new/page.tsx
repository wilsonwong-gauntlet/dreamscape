import { Metadata, ResolvingMetadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { CategoryForm } from '@/components/knowledge/CategoryForm'

type Props = {
  params: Promise<{}>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  _props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const previousImages = (await parent).openGraph?.images || []

  return {
    title: 'Create Category',
    description: 'Create a new knowledge base category',
    openGraph: {
      title: 'Create Category',
      description: 'Create a new knowledge base category',
      images: [...previousImages]
    }
  }
}

export default async function NewCategoryPage() {
  const supabase = await createClient()

  // Fetch categories for parent selection
  const { data: categories } = await supabase
    .from('kb_categories')
    .select('id, name, slug, description, parent_id')
    .order('name')

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">Create New Category</h1>
      
      <CategoryForm 
        categories={categories || []}
        initialData={{}}
        redirectPath="/admin/knowledge/categories"
      />
    </div>
  )
} 