'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
}

interface Article {
  id: string
  title: string
  content: string
  category_id: string | null
  status: 'draft' | 'published'
  slug: string
}

interface ArticleFormProps {
  categories: Category[]
  initialData: Partial<Article>
  redirectPath?: string
}

export function ArticleForm({ 
  categories, 
  initialData,
  redirectPath = '/admin/knowledge/articles'
}: ArticleFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Article>>({
    title: '',
    content: '',
    category_id: null,
    status: 'draft',
    ...initialData
  })

  const isEditing = !!initialData.id

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(
        isEditing 
          ? `/api/knowledge/articles/${initialData.id}`
          : '/api/knowledge/articles',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to save article')
      }

      const data = await response.json()
      
      toast.success(
        isEditing ? 'Article updated successfully' : 'Article created successfully'
      )
      
      router.push(redirectPath)
      router.refresh()
    } catch (error) {
      console.error('Error saving article:', error)
      toast.error('Failed to save article')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Article title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, content: e.target.value }))
            }
            placeholder="Article content"
            required
            className="min-h-[300px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_id || 'none'}
            onValueChange={(value) =>
              setFormData((prev) => ({ 
                ...prev, 
                category_id: value === 'none' ? null : value 
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status || 'draft'}
            onValueChange={(value) =>
              setFormData((prev) => ({ 
                ...prev, 
                status: value as 'draft' | 'published'
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditing ? 'Update Article' : 'Create Article'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
} 