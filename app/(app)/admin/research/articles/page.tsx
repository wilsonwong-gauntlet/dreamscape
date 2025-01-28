import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'
import DeleteArticleButton from '@/components/research/DeleteArticleButton'

interface Category {
  id: string
  name: string
}

interface Article {
  id: string
  title: string
  slug: string
  status: string
  content: string
  metadata: any
  content_vector: number[]
  view_count: number
  helpful_count: number
  created_at: string
  kb_categories: Category[] | null
}

export const metadata: Metadata = {
  title: 'Research Management',
  description: 'Manage investment research and market analysis'
}

export default async function AdminArticlesPage() {
  const supabase = await createClient()

  const { data: articles } = await supabase
    .from('kb_articles')
    .select(`
      id,
      title,
      slug,
      status,
      created_at,
      updated_at,
      view_count,
      helpful_count,
      kb_categories (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Research Management</h1>
          <p className="text-muted-foreground mt-1">Manage and publish investment research</p>
        </div>
        <Button asChild>
          <Link href="/admin/research/articles/new">
            Create Research
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Helpful</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles?.map((article) => (
              <TableRow key={article.id}>
                <TableCell className="font-medium">{article.title}</TableCell>
                <TableCell>
                  {Array.isArray(article.kb_categories) && article.kb_categories.length > 0
                    ? article.kb_categories.map(cat => cat.name).join(', ')
                    : ''}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    article.status === 'published'
                      ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                      : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                  }`}>
                    {article.status}
                  </span>
                </TableCell>
                <TableCell>{article.view_count || 0}</TableCell>
                <TableCell>{article.helpful_count || 0}</TableCell>
                <TableCell>{new Date(article.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/research/articles/${article.slug}/edit`}>
                          Edit research
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/research/${article.slug}`} target="_blank">
                          View research
                        </Link>
                      </DropdownMenuItem>
                      <DeleteArticleButton 
                        articleId={article.id} 
                        articleTitle={article.title} 
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 