import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { CategoryForm } from '@/components/research/CategoryForm'

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
  
  const { data: category } = await supabase
    .from('kb_categories')
    .select('name')
    .eq('slug', slug)
    .single()

  if (!category) {
    return {
      title: 'Category Not Found'
    }
  }

  const previousImages = (await parent).openGraph?.images || []

  return {
    title: `Edit ${category.name}`,
    description: `Edit knowledge base category: ${category.name}`,
    openGraph: {
      title: `Edit ${category.name}`,
      description: `Edit knowledge base category: ${category.name}`,
      images: [...previousImages]
    }
  }
}

export default async function EditCategoryPage({ params }: Props) {
  const slug = (await params).slug
  const supabase = await createClient()

  // Fetch category
  const { data: category } = await supabase
    .from('kb_categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) {
    notFound()
  }

  // Fetch all categories for parent selection
  const { data: categories } = await supabase
    .from('kb_categories')
    .select('id, name, slug, description, parent_id')
    .order('name')

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">Edit Category</h1>
      
      <CategoryForm 
        categories={categories || []}
        initialData={category}
        redirectPath="/admin/research/categories"
      />
    </div>
  )
} 