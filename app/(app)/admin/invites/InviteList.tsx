'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Copy, Link as LinkIcon } from 'lucide-react'

interface Team {
  id: string
  name: string
}

interface Invite {
  id: string
  email: string
  role: 'agent' | 'admin'
  team_id: string
  teams: { name: string }
  created_at: string
  expires_at: string
  used_at: string | null
  token: string
}

interface InviteListProps {
  teams: Team[]
  invites: Invite[]
}

export function InviteList({ teams, invites: initialInvites }: InviteListProps) {
  const [invites, setInvites] = useState(initialInvites)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'agent' | 'admin'>('agent')
  const [teamId, setTeamId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [newInviteId, setNewInviteId] = useState<string | null>(null)
  const supabase = createClient()

  async function createInvite(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .rpc('create_invite', {
          invite_email: email,
          invite_role: role,
          invite_team_id: teamId,
          inviter_id: user.id
        })

      if (error) throw error

      setInvites([data, ...invites])
      setEmail('')
      setNewInviteId(data.id)
      toast.success('Invite sent successfully')
      
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to create invite')
    } finally {
      setIsLoading(false)
    }
  }

  async function copyInviteLink(invite: Invite) {
    try {
      const link = `${window.location.origin}/auth/signup?token=${invite.token}&email=${invite.email}`
      await navigator.clipboard.writeText(link)
      toast.success('Invite link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy invite link')
    }
  }

  function getInvitePreview(invite: Invite) {
    return `${window.location.origin}/auth/signup?...${invite.token.slice(-6)}`
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createInvite} className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Select
            value={role}
            onValueChange={(value: 'agent' | 'admin') => setRole(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={teamId}
            onValueChange={setTeamId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={isLoading}>
            Send Invite
          </Button>
        </div>
      </form>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Team</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Expires</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invites.map((invite) => {
              const isActive = !invite.used_at && new Date(invite.expires_at) > new Date()
              const isNew = invite.id === newInviteId
              
              return (
                <tr key={invite.id} className={isNew ? "bg-primary/5" : undefined}>
                  <td className="p-3">{invite.email}</td>
                  <td className="p-3">{invite.role}</td>
                  <td className="p-3">{invite.teams?.name}</td>
                  <td className="p-3">
                    {invite.used_at ? (
                      <span className="text-muted-foreground">Used</span>
                    ) : new Date(invite.expires_at) < new Date() ? (
                      <span className="text-destructive">Expired</span>
                    ) : (
                      <span className="text-primary">Active</span>
                    )}
                  </td>
                  <td className="p-3">{format(new Date(invite.created_at), 'PP')}</td>
                  <td className="p-3">{format(new Date(invite.expires_at), 'PP')}</td>
                  <td className="p-3">
                    {isActive && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInviteLink(invite)}
                          title="Copy invite link"
                          className="h-8 w-8"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {isNew && (
                          <span className="text-xs text-primary font-medium">
                            New
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
} 