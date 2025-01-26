import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from 'lucide-react'
import DeleteArticleButton from '@/components/knowledge/DeleteArticleButton'

interface Category {
  name: string
}

interface ArticleMetadata {
  problem_types: string[]      // e.g., ["login_error", "authentication", "2fa"]
  required_info: string[]      // e.g., ["user_id", "error_message", "browser"]
  solution_steps: {
    step: string
    explanation: string
  }[]
  common_issues: {
    issue: string
    solution: string
  }[]
  example_queries: string[]    // e.g., ["Can't login", "2FA not working"]
  resolution_time: string      // e.g., "5_min", "requires_developer"
  applies_to: string[]         // e.g., ["web_app", "mobile_app"]
}

interface Article {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  content: string
  metadata: ArticleMetadata
  content_vector: number[] | null  // For semantic search
  view_count: number
  helpful_count: number
  created_at: string
  kb_categories: Category | null
}

export const metadata: Metadata = {
  title: 'Manage Articles',
  description: 'Manage knowledge base articles'
}

export default async function AdminArticlesPage() {
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
        <h1 className="text-2xl font-bold">Manage Articles</h1>
        <Button asChild>
          <Link href="/admin/knowledge/articles/new">
            Create Article
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
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles?.map((article) => (
              <TableRow key={article.id}>
                <TableCell className="font-medium">
                  <Link 
                    href={`/knowledge/${article.slug}`}
                    className="hover:text-primary"
                  >
                    {article.title}
                  </Link>
                </TableCell>
                <TableCell>{article.kb_categories?.name || 'Uncategorized'}</TableCell>
                <TableCell>
                  <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                    {article.status}
                  </Badge>
                </TableCell>
                <TableCell>{article.view_count}</TableCell>
                <TableCell>{article.helpful_count}</TableCell>
                <TableCell>{new Date(article.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/knowledge/articles/${article.slug}/edit`}>
                          Edit article
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

            {!articles?.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No articles found. Create your first article to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 