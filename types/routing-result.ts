import { RuleActionType } from './routing'

export interface RoutingResult {
  rule_id: string
  action: RuleActionType
  action_target: string
} 