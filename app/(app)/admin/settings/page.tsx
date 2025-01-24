'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const [companyName, setCompanyName] = useState('AutoCRM')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [slackNotifications, setSlackNotifications] = useState(false)
  const [autoAssignment, setAutoAssignment] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save settings logic here
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulated save
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">General Settings</h1>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-8">
        {/* Company Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Company Information</h2>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <div className="text-sm text-muted-foreground">
                  Receive notifications via email
                </div>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Slack Notifications</Label>
                <div className="text-sm text-muted-foreground">
                  Receive notifications via Slack
                </div>
              </div>
              <Switch
                checked={slackNotifications}
                onCheckedChange={setSlackNotifications}
              />
            </div>
          </div>
        </div>

        {/* Ticket Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Ticket Settings</h2>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Assignment</Label>
              <div className="text-sm text-muted-foreground">
                Automatically assign tickets to available agents
              </div>
            </div>
            <Switch
              checked={autoAssignment}
              onCheckedChange={setAutoAssignment}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 