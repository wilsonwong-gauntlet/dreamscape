import { Metadata } from 'next'
import Link from 'next/link'
import { FileText, FolderTree } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Research Administration',
  description: 'Manage research articles and categories'
}

export default function AdminResearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Research Administration</h1>
        <p className="text-muted-foreground mt-1">Manage research content and organization</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/admin/research/articles" className="block">
          <Card className="h-full hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Research Articles
              </CardTitle>
              <CardDescription>
                Manage and publish investment research and market analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create, edit, and organize research articles. Control publication status and track engagement metrics.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/research/categories" className="block">
          <Card className="h-full hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                Research Categories
              </CardTitle>
              <CardDescription>
                Organize research content with categories and topics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create and manage research categories. Structure your content with hierarchical organization.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
} 