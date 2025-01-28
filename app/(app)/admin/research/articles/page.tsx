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
  kb_categories: { name: string }[]
}

export const metadata: Metadata = {
  title: 'Research Management',
  description: 'Manage investment research and market analysis'
}

export default async function AdminResearchPage() {
  const supabase = await createClient()

  const { data: articles } = await supabase
    .from('kb_articles')
    .select<string, Article>(`
      id,
      title,
      slug,
      status,
      content,
      metadata,
      content_vector,
      view_count,
      helpful_count,
      created_at,
      kb_categories (
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
          <Link href="/admin/research/new">
            New Research
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Helpful</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles?.map((article) => (
              <TableRow key={article.id}>
                <TableCell className="font-medium">{article.title}</TableCell>
                <TableCell>
                  {article.kb_categories?.map(cat => cat.name).join(', ')}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    article.status === 'published' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {article.status}
                  </span>
                </TableCell>
                <TableCell>{article.view_count}</TableCell>
                <TableCell>{article.helpful_count}</TableCell>
                <TableCell>{new Date(article.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" asChild>
                    <Link href={`/admin/research/${article.id}/edit`}>
                      Edit
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 