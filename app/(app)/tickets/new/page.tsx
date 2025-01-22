'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export default function NewTicketPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!customer) throw new Error('Customer record not found')

      const { error } = await supabase
        .from('tickets')
        .insert({
          title,
          description,
          priority,
          customer_id: customer.id,
          source: 'web'
        })

      if (error) throw error

      toast.success('Ticket created successfully')
      router.push('/tickets')
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to create ticket')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Ticket</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            placeholder="Ticket title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <Textarea
            placeholder="Describe your issue"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
          />
        </div>
        <div>
          <Select
            value={priority}
            onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={isLoading}>
          Create Ticket
        </Button>
      </form>
    </div>
  )
} 