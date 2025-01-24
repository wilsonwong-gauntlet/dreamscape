'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Team, UpdateTeamInput, DaySchedule } from '@/types/team'

const timeZones = Intl.supportedValuesOf('timeZone')

export default function EditTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [timeZone, setTimeZone] = useState("UTC")
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [newFocusArea, setNewFocusArea] = useState("")
  const [maxCapacity, setMaxCapacity] = useState<number | null>(null)
  const [isBackup, setIsBackup] = useState(false)
  
  // Operating hours state
  const [operatingHours, setOperatingHours] = useState<Record<string, DaySchedule>>({
    monday: { start: "09:00", end: "17:00" },
    tuesday: { start: "09:00", end: "17:00" },
    wednesday: { start: "09:00", end: "17:00" },
    thursday: { start: "09:00", end: "17:00" },
    friday: { start: "09:00", end: "17:00" },
    saturday: null,
    sunday: null,
  })

  // Load team data
  useEffect(() => {
    const loadTeam = async () => {
      try {
        const response = await fetch(`/api/teams/${teamId}`)
        if (!response.ok) throw new Error('Failed to load team')
        
        const team: Team = await response.json()
        
        // Populate form state
        setName(team.name)
        setDescription(team.description)
        setTimeZone(team.timeZone)
        setFocusAreas(team.focusAreas)
        setMaxCapacity(team.maxCapacity)
        setIsBackup(team.isBackup)
        setOperatingHours(team.operatingHours)
      } catch (error) {
        console.error('Error loading team:', error)
        toast.error('Failed to load team')
        router.push('/admin/team')
      } finally {
        setIsLoading(false)
      }
    }

    loadTeam()
  }, [teamId, router])

  const handleAddFocusArea = () => {
    if (!newFocusArea.trim()) return
    setFocusAreas(prev => [...prev, newFocusArea.trim()])
    setNewFocusArea("")
  }

  const handleRemoveFocusArea = (index: number) => {
    setFocusAreas(prev => prev.filter((_, i) => i !== index))
  }

  const handleOperatingHoursChange = (day: string, type: 'start' | 'end', value: string) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day], [type]: value } : { start: "09:00", end: "17:00" }
    }))
  }

  const toggleDayEnabled = (day: string) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: prev[day] ? null : { start: "09:00", end: "17:00" }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          timeZone,
          focusAreas,
          maxCapacity,
          operatingHours,
          isBackup,
        } as UpdateTeamInput),
      })

      if (!response.ok) throw new Error('Failed to update team')

      toast.success('Team updated successfully')
      router.push('/admin/team')
    } catch (error) {
      console.error('Error updating team:', error)
      toast.error('Failed to update team')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Edit Team</h1>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Basic Information</h2>
              
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeZone">Time Zone</Label>
                <Select value={timeZone} onValueChange={setTimeZone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeZones.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCapacity">Maximum Capacity</Label>
                <Input
                  id="maxCapacity"
                  type="number"
                  value={maxCapacity || ''}
                  onChange={(e) => setMaxCapacity(e.target.value ? Number(e.target.value) : null)}
                  min={1}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Backup Team</Label>
                  <div className="text-sm text-muted-foreground">
                    Mark this team as a backup/overflow team
                  </div>
                </div>
                <Switch
                  checked={isBackup}
                  onCheckedChange={setIsBackup}
                />
              </div>
            </div>

            {/* Focus Areas */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Focus Areas</h2>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newFocusArea}
                    onChange={(e) => setNewFocusArea(e.target.value)}
                    placeholder="Add focus area"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFocusArea())}
                  />
                  <Button type="button" onClick={handleAddFocusArea}>Add</Button>
                </div>

                {focusAreas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {focusAreas.map((area, index) => (
                      <Badge key={index} variant="secondary">
                        {area}
                        <button
                          type="button"
                          onClick={() => handleRemoveFocusArea(index)}
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

            {/* Operating Hours */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Operating Hours</h2>
              
              <div className="space-y-4">
                {Object.entries(operatingHours).map(([day, schedule]) => (
                  <div key={day} className="flex items-center gap-4">
                    <Switch
                      checked={!!schedule}
                      onCheckedChange={() => toggleDayEnabled(day)}
                    />
                    <div className="w-24 font-medium capitalize">{day}</div>
                    {schedule && (
                      <>
                        <Input
                          type="time"
                          value={schedule.start}
                          onChange={(e) => handleOperatingHoursChange(day, 'start', e.target.value)}
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={schedule.end}
                          onChange={(e) => handleOperatingHoursChange(day, 'end', e.target.value)}
                          className="w-32"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
} 