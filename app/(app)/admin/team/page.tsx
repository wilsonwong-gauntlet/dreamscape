'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreVertical, Users, Clock, Gauge } from "lucide-react"
import { toast } from "sonner"
import type { Team } from '@/types/team'

export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  const loadTeams = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/teams')
      if (!response.ok) throw new Error('Failed to load teams')
      const data = await response.json()
      setTeams(data)
    } catch (error) {
      console.error('Error loading teams:', error)
      toast.error('Failed to load teams')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTeams()
  }, [])

  const handleCreateTeam = () => {
    router.push('/admin/team/new')
  }

  const handleEditTeam = (teamId: string) => {
    router.push(`/admin/team/${teamId}`)
  }

  const handleViewMembers = (teamId: string) => {
    router.push(`/admin/team/${teamId}/members`)
  }

  const handleViewSchedule = (teamId: string) => {
    router.push(`/admin/team/${teamId}/schedule`)
  }

  const handleViewMetrics = (teamId: string) => {
    router.push(`/admin/team/${teamId}/metrics`)
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    team.description.toLowerCase().includes(search.toLowerCase()) ||
    team.focusAreas.some(area => area.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Team Management</h1>
        <Button onClick={handleCreateTeam}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Teams Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Focus Areas</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Time Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map(team => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-muted-foreground">{team.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {team.focusAreas.map((area, i) => (
                          <Badge key={i} variant="secondary" className="bg-accent/50">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* We'll add member count here when we have it */}
                      -
                    </TableCell>
                    <TableCell>{team.timeZone}</TableCell>
                    <TableCell>
                      {team.isBackup ? (
                        <Badge variant="secondary">Backup</Badge>
                      ) : (
                        <Badge variant="default">Primary</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTeam(team.id)}>
                            Edit Team
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewMembers(team.id)}>
                            <Users className="h-4 w-4 mr-2" />
                            Manage Members
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewSchedule(team.id)}>
                            <Clock className="h-4 w-4 mr-2" />
                            Coverage Schedule
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewMetrics(team.id)}>
                            <Gauge className="h-4 w-4 mr-2" />
                            Performance Metrics
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* AI Insights Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">AI Insights</h3>
            <div className="space-y-4">
              {teams.some(team => team.aiSuggestions?.staffingSuggestion) ? (
                teams.map(team => team.aiSuggestions?.staffingSuggestion && (
                  <div key={team.id} className="flex items-start gap-4">
                    <div className="text-sm">
                      <span className="font-medium">{team.name}:</span>{' '}
                      {team.aiSuggestions.staffingSuggestion}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  AI insights will appear here as your teams process more tickets.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 