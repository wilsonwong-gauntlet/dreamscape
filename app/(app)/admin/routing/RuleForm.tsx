"use client"

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
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
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { 
  RoutingRule, 
  RuleCondition,
  RuleActionType,
  RuleOperator,
  RULE_FIELDS,
  getOperatorsForField 
} from '@/types/routing'

interface RuleFormProps {
  rule?: RoutingRule | null
  teams: { id: string; name: string }[]
  agents: { id: string; name: string; email: string; team_id: string }[]
  onSave: (rule: Partial<RoutingRule>) => void
  onCancel: () => void
}

export function RuleForm({ rule, teams, agents, onSave, onCancel }: RuleFormProps) {
  const [name, setName] = useState(rule?.name || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [priority, setPriority] = useState(rule?.priority?.toString() || '100')
  const [conditions, setConditions] = useState<RuleCondition[]>(rule?.conditions || [])
  const [action, setAction] = useState<RuleActionType>(rule?.action || 'assign_team')
  const [actionTarget, setActionTarget] = useState(rule?.action_target || '')

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { field: RULE_FIELDS[0].id, operator: 'equals' as RuleOperator, value: '' }
    ])
  }

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const handleConditionChange = (index: number, updates: Partial<RuleCondition>) => {
    setConditions(conditions.map((condition, i) => 
      i === index
        ? { ...condition, ...updates }
        : condition
    ))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!name || !priority || conditions.length === 0 || !action || !actionTarget) {
      alert('Please fill in all required fields')
      return
    }

    onSave({
      name,
      description,
      priority: parseInt(priority),
      conditions,
      action,
      action_target: actionTarget,
      is_active: rule?.is_active ?? true
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., High Priority Support"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                value={priority}
                onChange={e => setPriority(e.target.value)}
                placeholder="Lower number = higher priority"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description of when this rule applies"
              rows={2}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Conditions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>

            <div className="space-y-2">
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Select
                    value={condition.field}
                    onValueChange={value => handleConditionChange(index, { field: value })}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_FIELDS.map(field => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={condition.operator}
                    onValueChange={value => handleConditionChange(index, { operator: value as RuleOperator })}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperatorsForField(condition.field).map(operator => (
                        <SelectItem key={operator} value={operator}>
                          {operator.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={typeof condition.value === 'string' ? condition.value : JSON.stringify(condition.value)}
                    onChange={e => handleConditionChange(index, { 
                      value: e.target.value
                    })}
                    placeholder="Value"
                    className="flex-1"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCondition(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {conditions.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No conditions added yet
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Label>Action</Label>
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={action}
                onValueChange={value => setAction(value as RuleActionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assign_team">Assign to Team</SelectItem>
                  <SelectItem value="assign_agent">Assign to Agent</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={actionTarget}
                onValueChange={setActionTarget}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {action === 'assign_team' ? (
                    teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))
                  ) : (
                    agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name || agent.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit">
            {rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </Card>
    </form>
  )
} 