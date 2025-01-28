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
  slug: string
  description: string | null
  parent_id: string | null
}

interface CategoryFormProps {
  categories: Category[]
  initialData: Partial<Category>
  redirectPath?: string
}

export function CategoryForm({ 
  categories, 
  initialData,
  redirectPath = '/research/categories'
}: CategoryFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    description: '',
    parent_id: null,
    ...initialData
  })

  const isEditing = !!initialData.id

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const endpoint = initialData
        ? `/api/research/categories/${initialData.id}`
        : '/api/research/categories'

      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to save category')
      }

      const data = await response.json()
      
      toast.success(
        isEditing ? 'Category updated successfully' : 'Category created successfully'
      )
      
      router.push(redirectPath)
      router.refresh()
    } catch (error) {
      console.error('Error saving category:', error)
      toast.error('Failed to save category')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter out the current category and its children from parent options
  const availableParents = categories.filter(category => {
    if (isEditing) {
      return category.id !== initialData.id && category.parent_id !== initialData.id
    }
    return true
  })

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Category name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Category description"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="parent">Parent Category</Label>
          <Select
            value={formData.parent_id || 'none'}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, parent_id: value === 'none' ? null : value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a parent category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {availableParents.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}
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