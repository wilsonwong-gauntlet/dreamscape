"use client"

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { RoutingRule } from '@/types/routing'
import { RuleForm } from './RuleForm'

interface RoutingRuleListProps {
  rules: RoutingRule[]
  teams: { id: string; name: string }[]
  agents: { id: string; name: string; email: string; team_id: string }[]
}

export function RoutingRuleList({ rules: initialRules, teams, agents }: RoutingRuleListProps) {
  const [rules, setRules] = useState(initialRules)
  const [isCreating, setIsCreating] = useState(false)
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null)
  const supabase = createClient()

  const handleToggleActive = async (rule: RoutingRule) => {
    try {
      const { error } = await supabase
        .from('routing_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id)

      if (error) throw error

      setRules(rules.map(r => 
        r.id === rule.id 
          ? { ...r, is_active: !r.is_active }
          : r
      ))

      toast.success(`Rule ${rule.is_active ? 'disabled' : 'enabled'}`)
    } catch (error) {
      console.error('Error toggling rule:', error)
      toast.error('Failed to update rule')
    }
  }

  const handleDelete = async (rule: RoutingRule) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const { error } = await supabase
        .from('routing_rules')
        .delete()
        .eq('id', rule.id)

      if (error) throw error

      setRules(rules.filter(r => r.id !== rule.id))
      toast.success('Rule deleted')
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast.error('Failed to delete rule')
    }
  }

  const handleSave = async (rule: Partial<RoutingRule>) => {
    try {
      if (editingRule) {
        // Update existing rule
        const { error } = await supabase
          .from('routing_rules')
          .update(rule)
          .eq('id', editingRule.id)

        if (error) throw error

        setRules(rules.map(r => 
          r.id === editingRule.id 
            ? { ...r, ...rule }
            : r
        ))
        toast.success('Rule updated')
      } else {
        // Create new rule
        const { data, error } = await supabase
          .from('routing_rules')
          .insert(rule)
          .select()
          .single()

        if (error) throw error

        setRules([...rules, data])
        toast.success('Rule created')
      }

      setIsCreating(false)
      setEditingRule(null)
    } catch (error) {
      console.error('Error saving rule:', error)
      toast.error('Failed to save rule')
    }
  }

  const getTargetName = (rule: RoutingRule) => {
    if (rule.action === 'assign_team') {
      return teams.find(t => t.id === rule.action_target)?.name || 'Unknown team'
    } else {
      const agent = agents.find(a => a.id === rule.action_target)
      return agent?.name || agent?.email || 'Unknown agent'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {(isCreating || editingRule) && (
        <RuleForm
          rule={editingRule}
          teams={teams}
          agents={agents}
          onSave={handleSave}
          onCancel={() => {
            setIsCreating(false)
            setEditingRule(null)
          }}
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Priority</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Conditions</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.priority}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    {rule.description && (
                      <div className="text-sm text-muted-foreground">
                        {rule.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {rule.conditions.map((condition, i) => (
                      <div key={i} className="text-sm">
                        {condition.field} {condition.operator} {JSON.stringify(condition.value)}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={rule.action === 'assign_team' ? 'default' : 'secondary'}>
                    {rule.action === 'assign_team' ? 'Assign to team' : 'Assign to agent'}:
                    {' '}
                    {getTargetName(rule)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => handleToggleActive(rule)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRule(rule)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rule)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No routing rules configured yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 