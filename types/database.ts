export type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Team {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  team_id: string | null
  role: string
  status: string
  skills: string[]
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  external_id: string | null
  company: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  customer_id: string
  assigned_agent_id: string | null
  team_id: string | null
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  source: string
  tags: string[]
  metadata: Record<string, any>
  custom_fields: Record<string, any>
  created_at: string
  updated_at: string
}

export interface TicketHistory {
  id: string
  ticket_id: string
  actor_id: string
  action: string
  changes: Record<string, any>
  created_at: string
}

export interface TicketResponse {
  id: string
  ticket_id: string
  author_id: string
  content: string
  type: 'ai' | 'human'
  is_internal: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface KBArticle {
  id: string
  title: string
  content: string
  category: string | null
  tags: string[]
  author_id: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// Channel-specific metadata types
export interface EmailMetadata {
  from: string
  subject: string
  threadId: string
  attachments: Array<{
    name: string
    url: string
    type: string
    size: number
  }>
}

export interface ChatMetadata {
  sessionId: string
  userAgent: string
  location: string
}

export interface WebMetadata {
  browser: string
  url: string
  formData: Record<string, any>
}

// Database helper types
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }
export type TimestampFields = {
  created_at: string
  updated_at: string
} 