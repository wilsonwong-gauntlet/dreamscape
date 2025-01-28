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
import { PlusCircle, X } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
}

interface ArticleMetadata {
  problem_types: string[]
  required_info: string[]
  solution_steps: {
    step: string
    explanation: string
  }[]
  common_issues: {
    issue: string
    solution: string
  }[]
  example_queries: string[]
  resolution_time: string
  applies_to: string[]
}

interface Article {
  id: string
  title: string
  content: string
  category_id: string | null
  status: 'draft' | 'published'
  slug: string
  metadata: ArticleMetadata
}

interface ArticleFormProps {
  categories: Category[]
  initialData: Partial<Article>
  redirectPath?: string
}

const RESOLUTION_TIMES = [
  '5_min',
  '15_min',
  '30_min',
  '1_hour',
  'requires_developer',
  'requires_investigation'
]

const PLATFORMS = [
  'web_app',
  'mobile_app',
  'desktop_app',
  'api',
  'all_platforms'
]

export default function ArticleForm({ 
  categories, 
  initialData,
  redirectPath = '/admin/research/articles'
}: ArticleFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Article>>({
    title: '',
    content: '',
    category_id: null,
    status: 'draft',
    metadata: {
      problem_types: [],
      required_info: [],
      solution_steps: [],
      common_issues: [],
      example_queries: [],
      resolution_time: '5_min',
      applies_to: ['web_app']
    } as ArticleMetadata,
    ...initialData
  })

  const isEditing = !!initialData.id

  // Helper function to get metadata with defaults
  const getMetadata = () => ({
    problem_types: [],
    required_info: [],
    solution_steps: [],
    common_issues: [],
    example_queries: [],
    resolution_time: '5_min',
    applies_to: ['web_app'],
    ...formData.metadata
  } as ArticleMetadata)

  // Helper function to update metadata
  const updateMetadata = (key: keyof ArticleMetadata, value: any) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...getMetadata(),
        [key]: value
      }
    }))
  }

  // Add new item to array fields
  const addArrayItem = (key: keyof ArticleMetadata, item: any) => {
    const metadata = getMetadata()
    const currentArray = metadata[key] as any[]
    updateMetadata(key, [...currentArray, item])
  }

  // Remove item from array fields
  const removeArrayItem = (key: keyof ArticleMetadata, index: number) => {
    const metadata = getMetadata()
    const currentArray = metadata[key] as any[]
    updateMetadata(key, currentArray.filter((_, i) => i !== index))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const endpoint = initialData
        ? `/api/research/articles/${initialData.id}`
        : '/api/research/articles'

      const response = await fetch(
        endpoint,
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
        {/* Basic Info */}
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
            className="min-h-[200px]"
          />
        </div>

        {/* Problem Types */}
        <div className="space-y-2">
          <Label>Problem Types</Label>
          <div className="flex flex-wrap gap-2">
            {getMetadata().problem_types.map((type, index) => (
              <div key={index} className="flex items-center gap-2 bg-secondary p-2 rounded-md">
                <span>{type}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => removeArrayItem('problem_types', index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add problem type"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const input = e.currentTarget
                  if (input.value) {
                    addArrayItem('problem_types', input.value)
                    input.value = ''
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement
                if (input.value) {
                  addArrayItem('problem_types', input.value)
                  input.value = ''
                }
              }}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Solution Steps */}
        <div className="space-y-2">
          <Label>Solution Steps</Label>
          {getMetadata().solution_steps.map((step, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <Input
                  value={step.step}
                  onChange={(e) => {
                    const newSteps = [...(getMetadata().solution_steps || [])]
                    newSteps[index] = { ...step, step: e.target.value }
                    updateMetadata('solution_steps', newSteps)
                  }}
                  placeholder="Step title"
                />
                <Textarea
                  value={step.explanation}
                  onChange={(e) => {
                    const newSteps = [...(getMetadata().solution_steps || [])]
                    newSteps[index] = { ...step, explanation: e.target.value }
                    updateMetadata('solution_steps', newSteps)
                  }}
                  placeholder="Step explanation"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArrayItem('solution_steps', index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => addArrayItem('solution_steps', { step: '', explanation: '' })}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Solution Step
          </Button>
        </div>

        {/* Resolution Time */}
        <div className="space-y-2">
          <Label htmlFor="resolution_time">Resolution Time</Label>
          <Select
            value={getMetadata().resolution_time}
            onValueChange={(value) => updateMetadata('resolution_time', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTION_TIMES.map((time) => (
                <SelectItem key={time} value={time}>
                  {time.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Applies To */}
        <div className="space-y-2">
          <Label>Applies To</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => (
              <Button
                key={platform}
                type="button"
                variant={getMetadata().applies_to.includes(platform) ? 'default' : 'outline'}
                onClick={() => {
                  const current = getMetadata().applies_to
                  if (current.includes(platform)) {
                    updateMetadata('applies_to', current.filter(p => p !== platform))
                  } else {
                    updateMetadata('applies_to', [...current, platform])
                  }
                }}
              >
                {platform.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Category and Status */}
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