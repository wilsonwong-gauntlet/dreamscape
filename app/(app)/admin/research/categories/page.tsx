import { Metadata, ResolvingMetadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { CategoryList } from '@/components/research/CategoryList'

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
    title: 'Manage Categories',
    description: 'Manage research categories and topics',
    openGraph: {
      title: 'Manage Categories',
      description: 'Manage research categories and topics',
      images: [...previousImages]
    }
  }
}

export default async function AdminCategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('kb_categories')
    .select(`
      id,
      name,
      slug,
      description,
      parent_id,
      kb_articles (count)
    `)
    .order('name')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Research Categories</h1>
        <Button asChild>
          <Link href="/admin/research/categories/new">
            Create Category
          </Link>
        </Button>
      </div>

      <CategoryList categories={categories || []} isAdmin />
    </div>
  )
} 