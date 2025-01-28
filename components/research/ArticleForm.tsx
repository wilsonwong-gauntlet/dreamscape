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
  investment_type: string[]
  risk_level: 'low' | 'medium' | 'high'
  time_horizon: 'short_term' | 'medium_term' | 'long_term'
  market_conditions: string[]
  key_points: string[]
  methodology: string
  data_sources: string[]
  performance_metrics: {
    metric: string
    value: string
  }[]
  disclaimers: string[]
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

const INVESTMENT_TYPES = [
  'stocks',
  'bonds',
  'real_estate',
  'commodities',
  'crypto',
  'forex',
  'etfs',
  'mutual_funds',
  'options',
  'futures'
]

const MARKET_CONDITIONS = [
  'bull_market',
  'bear_market',
  'volatile',
  'stable',
  'recovery',
  'recession',
  'high_inflation',
  'low_inflation'
]

const TIME_HORIZONS = [
  { value: 'short_term', label: 'Short Term (0-1 year)' },
  { value: 'medium_term', label: 'Medium Term (1-5 years)' },
  { value: 'long_term', label: 'Long Term (5+ years)' }
]

const RISK_LEVELS = [
  { value: 'low', label: 'Low Risk' },
  { value: 'medium', label: 'Medium Risk' },
  { value: 'high', label: 'High Risk' }
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
      applies_to: ['web_app'],
      investment_type: [],
      risk_level: 'medium',
      time_horizon: 'medium_term',
      market_conditions: [],
      key_points: [],
      methodology: '',
      data_sources: [],
      performance_metrics: [],
      disclaimers: []
    } as ArticleMetadata,
    ...initialData
  })

  const isEditing = !!initialData?.id

  // Helper function to get metadata with defaults
  const getMetadata = () => ({
    problem_types: [],
    required_info: [],
    solution_steps: [],
    common_issues: [],
    example_queries: [],
    resolution_time: '5_min',
    applies_to: ['web_app'],
    investment_type: [],
    risk_level: 'medium',
    time_horizon: 'medium_term',
    market_conditions: [],
    key_points: [],
    methodology: '',
    data_sources: [],
    performance_metrics: [],
    disclaimers: [],
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
      const endpoint = initialData?.id
        ? `/api/research/articles/${initialData.id}`
        : '/api/research/articles'

      console.log('Form submission details:', {
        isEditing,
        endpoint,
        initialData,
        formData
      })

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
        const errorData = await response.json()
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(errorData.error || 'Failed to save article')
      }

      const data = await response.json()
      console.log('API Success Response:', data)
      
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

        {/* Investment Details */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Investment Details</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Investment Types</Label>
              <div className="flex flex-wrap gap-2">
                {INVESTMENT_TYPES.map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={getMetadata().investment_type.includes(type) ? 'default' : 'outline'}
                    onClick={() => {
                      const current = getMetadata().investment_type
                      if (current.includes(type)) {
                        updateMetadata('investment_type', current.filter(t => t !== type))
                      } else {
                        updateMetadata('investment_type', [...current, type])
                      }
                    }}
                  >
                    {type.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select
                value={getMetadata().risk_level}
                onValueChange={(value) => updateMetadata('risk_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Horizon</Label>
              <Select
                value={getMetadata().time_horizon}
                onValueChange={(value) => updateMetadata('time_horizon', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_HORIZONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Market Conditions</Label>
              <div className="flex flex-wrap gap-2">
                {MARKET_CONDITIONS.map((condition) => (
                  <Button
                    key={condition}
                    type="button"
                    variant={getMetadata().market_conditions.includes(condition) ? 'default' : 'outline'}
                    onClick={() => {
                      const current = getMetadata().market_conditions
                      if (current.includes(condition)) {
                        updateMetadata('market_conditions', current.filter(c => c !== condition))
                      } else {
                        updateMetadata('market_conditions', [...current, condition])
                      }
                    }}
                  >
                    {condition.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Research Details */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Research Details</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Points</Label>
              <div className="space-y-2">
                {getMetadata().key_points.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={point}
                      onChange={(e) => {
                        const newPoints = [...getMetadata().key_points]
                        newPoints[index] = e.target.value
                        updateMetadata('key_points', newPoints)
                      }}
                      placeholder="Key point"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newPoints = getMetadata().key_points.filter((_, i) => i !== index)
                        updateMetadata('key_points', newPoints)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const newPoints = [...getMetadata().key_points, '']
                    updateMetadata('key_points', newPoints)
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Key Point
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Methodology</Label>
              <Textarea
                value={getMetadata().methodology}
                onChange={(e) => updateMetadata('methodology', e.target.value)}
                placeholder="Research methodology"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Sources</Label>
              <div className="space-y-2">
                {getMetadata().data_sources.map((source, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={source}
                      onChange={(e) => {
                        const newSources = [...getMetadata().data_sources]
                        newSources[index] = e.target.value
                        updateMetadata('data_sources', newSources)
                      }}
                      placeholder="Data source"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newSources = getMetadata().data_sources.filter((_, i) => i !== index)
                        updateMetadata('data_sources', newSources)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const newSources = [...getMetadata().data_sources, '']
                    updateMetadata('data_sources', newSources)
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Data Source
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Performance Metrics</Label>
              <div className="space-y-2">
                {getMetadata().performance_metrics.map((metric, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={metric.metric}
                      onChange={(e) => {
                        const newMetrics = [...getMetadata().performance_metrics]
                        newMetrics[index] = { ...metric, metric: e.target.value }
                        updateMetadata('performance_metrics', newMetrics)
                      }}
                      placeholder="Metric name"
                    />
                    <Input
                      value={metric.value}
                      onChange={(e) => {
                        const newMetrics = [...getMetadata().performance_metrics]
                        newMetrics[index] = { ...metric, value: e.target.value }
                        updateMetadata('performance_metrics', newMetrics)
                      }}
                      placeholder="Value"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newMetrics = getMetadata().performance_metrics.filter((_, i) => i !== index)
                        updateMetadata('performance_metrics', newMetrics)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const newMetrics = [...getMetadata().performance_metrics, { metric: '', value: '' }]
                    updateMetadata('performance_metrics', newMetrics)
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Performance Metric
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Disclaimers</Label>
              <div className="space-y-2">
                {getMetadata().disclaimers.map((disclaimer, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      value={disclaimer}
                      onChange={(e) => {
                        const newDisclaimers = [...getMetadata().disclaimers]
                        newDisclaimers[index] = e.target.value
                        updateMetadata('disclaimers', newDisclaimers)
                      }}
                      placeholder="Disclaimer text"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newDisclaimers = getMetadata().disclaimers.filter((_, i) => i !== index)
                        updateMetadata('disclaimers', newDisclaimers)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const newDisclaimers = [...getMetadata().disclaimers, '']
                    updateMetadata('disclaimers', newDisclaimers)
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Disclaimer
                </Button>
              </div>
            </div>
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