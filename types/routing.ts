export type RuleActionType = 'assign_team' | 'assign_agent'

export type RuleOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'less_than'

export interface RuleCondition {
  field: string
  operator: RuleOperator
  value: any
}

export interface RoutingRule {
  id: string
  name: string
  description?: string
  team_id?: string
  is_active: boolean
  priority: number
  conditions: RuleCondition[]
  action: RuleActionType
  action_target: string
  created_at: string
  updated_at: string
}

// Available fields for conditions
export const RULE_FIELDS = [
  { id: 'title', label: 'Title', type: 'text' },
  { id: 'description', label: 'Description', type: 'text' },
  { id: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'] },
  { id: 'source', label: 'Source', type: 'text' },
  { id: 'tags', label: 'Tags', type: 'array' },
] as const

// Operators available for each field type
export const FIELD_OPERATORS: Record<string, RuleOperator[]> = {
  text: ['equals', 'not_equals', 'contains'],
  select: ['equals', 'not_equals', 'in', 'not_in'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than'],
  array: ['contains', 'in', 'not_in']
}

// Helper to get operators for a field
export function getOperatorsForField(fieldId: string): RuleOperator[] {
  const field = RULE_FIELDS.find(f => f.id === fieldId)
  if (!field) return []
  return FIELD_OPERATORS[field.type] || []
} 