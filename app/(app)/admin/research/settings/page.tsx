import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export const metadata: Metadata = {
  title: 'Knowledge Base Settings',
  description: 'Configure knowledge base settings'
}

export default async function KnowledgeBaseSettingsPage() {
  const supabase = await createClient()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Knowledge Base Settings</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure general settings for your knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Public Access</Label>
                <p className="text-sm text-muted-foreground">
                  Allow public access to knowledge base articles without authentication
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Article Feedback</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to mark articles as helpful or not helpful
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>View Counts</Label>
                <p className="text-sm text-muted-foreground">
                  Track and display article view counts
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 