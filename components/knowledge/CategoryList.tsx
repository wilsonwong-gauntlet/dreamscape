'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreVertical } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  kb_articles: { count: number }[]
}

interface CategoryListProps {
  categories: Category[]
  isAdmin?: boolean
}

export function CategoryList({ categories, isAdmin = false }: CategoryListProps) {
  const router = useRouter()

  async function handleDelete(categoryId: string) {
    try {
      const response = await fetch(`/api/knowledge/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete category')
      }

      toast.success('Category deleted successfully')
      router.refresh()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Failed to delete category')
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-xl">
                <Link 
                  href={isAdmin 
                    ? `/admin/knowledge/categories/${category.slug}/edit`
                    : `/knowledge/categories/${category.slug}`
                  }
                  className="hover:text-primary"
                >
                  {category.name}
                </Link>
              </CardTitle>
              {category.description && (
                <CardDescription className="mt-1.5">
                  {category.description}
                </CardDescription>
              )}
            </div>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/knowledge/categories/${category.slug}/edit`}>
                      Edit category
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(category.id)}
                  >
                    Delete category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {category.kb_articles[0]?.count || 0} articles
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 