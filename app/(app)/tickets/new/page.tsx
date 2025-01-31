'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

export default function NewTicketPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!customer) throw new Error('Customer record not found')

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          source: 'web',
          customer_id: customer.id
        })
      })

      const data = await response.json()
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create ticket')
      }

      toast.success('Ticket created successfully')
      router.push('/tickets')
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to create ticket. Please try again.')
      toast.error('Failed to create ticket')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Create New Ticket</h1>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="text-muted-foreground"
        >
          Cancel
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Brief summary of your issue"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isLoading}
            className={cn(
              "transition-colors",
              title.length > 0 && "border-primary"
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Please provide detailed information about your issue"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={isLoading}
            className={cn(
              "min-h-[150px] transition-colors",
              description.length > 0 && "border-primary"
            )}
          />
          <p className="text-xs text-muted-foreground">
            Include any relevant details that will help us assist you better.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority Level</Label>
          <Select
            value={priority}
            onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setPriority(value)}
            disabled={isLoading}
          >
            <SelectTrigger id="priority" className="w-full">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low - General inquiry or minor issue</SelectItem>
              <SelectItem value="medium">Medium - Standard support request</SelectItem>
              <SelectItem value="high">High - Significant impact on business</SelectItem>
              <SelectItem value="urgent">Urgent - Critical system/business blocker</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={isLoading || !title || !description}
            className="flex-1"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating Ticket...' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </div>
  )
} 