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
import { Copy } from 'lucide-react'

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
  const [inviteLink, setInviteLink] = useState('')
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
      
      const link = `${window.location.origin}/auth/signup?token=${data.token}&email=${email}`
      setInviteLink(link)
      toast.success('Invite sent successfully')
      
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to create invite')
    } finally {
      setIsLoading(false)
    }
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast.success('Invite link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy invite link')
    }
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

      {inviteLink && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1 font-mono text-sm break-all">
            {inviteLink}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={copyInviteLink}
            title="Copy invite link"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}

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
            </tr>
          </thead>
          <tbody className="divide-y">
            {invites.map((invite) => (
              <tr key={invite.id}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 