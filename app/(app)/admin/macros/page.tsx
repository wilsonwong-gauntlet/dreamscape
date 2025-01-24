'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, Pencil, Trash2, Loader2, X } from "lucide-react"
import { toast } from "sonner"

interface Macro {
  id: string
  title: string
  content: string
  description?: string
  category?: string
  variables?: string[]
  team?: {
    id: string
    name: string
  }
  created_by_user?: {
    email: string
    user_metadata?: {
      name?: string
    }
  }
}

export default function MacrosPage() {
  const [macros, setMacros] = useState<Macro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [variables, setVariables] = useState<string[]>([])
  const [newVariable, setNewVariable] = useState("")

  const loadMacros = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/macros')
      if (!response.ok) throw new Error('Failed to load macros')
      const data = await response.json()
      setMacros(data)
    } catch (error) {
      console.error('Error loading macros:', error)
      toast.error('Failed to load macros')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMacros()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/macros' + (editingMacro ? `/${editingMacro.id}` : ''), {
        method: editingMacro ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          description,
          category,
          variables
        }),
      })

      if (!response.ok) throw new Error('Failed to save macro')

      toast.success(`Macro ${editingMacro ? 'updated' : 'created'} successfully`)
      loadMacros()
      handleCloseDialog()
    } catch (error) {
      console.error('Error saving macro:', error)
      toast.error('Failed to save macro')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this macro?')) return

    try {
      const response = await fetch(`/api/macros/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete macro')

      toast.success('Macro deleted successfully')
      loadMacros()
    } catch (error) {
      console.error('Error deleting macro:', error)
      toast.error('Failed to delete macro')
    }
  }

  const handleEdit = (macro: Macro) => {
    setEditingMacro(macro)
    setTitle(macro.title)
    setContent(macro.content)
    setDescription(macro.description || '')
    setCategory(macro.category || '')
    setVariables(macro.variables || [])
    setShowCreateDialog(true)
  }

  const handleCloseDialog = () => {
    setShowCreateDialog(false)
    setEditingMacro(null)
    setTitle('')
    setContent('')
    setDescription('')
    setCategory('')
    setVariables([])
    setNewVariable('')
  }

  const addVariable = () => {
    if (!newVariable.trim()) return
    setVariables(prev => [...prev, newVariable.trim()])
    setNewVariable('')
  }

  const removeVariable = (index: number) => {
    setVariables(prev => prev.filter((_, i) => i !== index))
  }

  const filteredMacros = macros.filter(macro =>
    macro.title.toLowerCase().includes(search.toLowerCase()) ||
    macro.description?.toLowerCase().includes(search.toLowerCase()) ||
    macro.category?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Response Macros</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Macro
        </Button>
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search macros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Macros List */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMacros.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No macros found
            </div>
          ) : (
            filteredMacros.map(macro => (
              <Card key={macro.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-medium">{macro.title}</h3>
                      {macro.description && (
                        <p className="text-sm text-muted-foreground">{macro.description}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        {macro.category && (
                          <Badge variant="secondary" className="bg-accent/50">
                            {macro.category}
                          </Badge>
                        )}
                        {macro.team && (
                          <Badge variant="outline">
                            {macro.team.name}
                          </Badge>
                        )}
                      </div>
                      {macro.variables && macro.variables.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-2">
                          <span className="text-xs text-muted-foreground">Variables:</span>
                          {macro.variables.map((variable, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {macro.created_by_user && (
                        <p className="text-xs text-muted-foreground pt-2">
                          Created by {macro.created_by_user.user_metadata?.name || macro.created_by_user.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(macro)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(macro.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingMacro ? 'Edit Macro' : 'Create New Macro'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Variables</Label>
                <div className="flex gap-2">
                  <Input
                    value={newVariable}
                    onChange={(e) => setNewVariable(e.target.value)}
                    placeholder="Add variable"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                  />
                  <Button type="button" onClick={addVariable}>Add</Button>
                </div>
                {variables.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {variables.map((variable, index) => (
                      <Badge key={index} variant="secondary">
                        {variable}
                        <button
                          type="button"
                          onClick={() => removeVariable(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingMacro ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingMacro ? 'Update Macro' : 'Create Macro'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 