export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      agents: {
        Row: {
          id: string
          team_id: string | null
          role: string
          status: string
          skills: string[]
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          team_id?: string | null
          role: string
          status?: string
          skills?: string[]
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string | null
          role?: string
          status?: string
          skills?: string[]
          created_at?: string | null
          updated_at?: string | null
        }
      }
      tickets: {
        Row: {
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
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          assigned_agent_id?: string | null
          team_id?: string | null
          title: string
          description: string
          status?: TicketStatus
          priority?: TicketPriority
          source: string
          tags?: string[]
          metadata?: Record<string, any>
          custom_fields?: Record<string, any>
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          assigned_agent_id?: string | null
          team_id?: string | null
          title?: string
          description?: string
          status?: TicketStatus
          priority?: TicketPriority
          source?: string
          tags?: string[]
          metadata?: Record<string, any>
          custom_fields?: Record<string, any>
          created_at?: string | null
          updated_at?: string | null
        }
      }
      routing_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          team_id: string | null
          is_active: boolean
          priority: number
          conditions: any[]
          action: string
          action_target: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          team_id?: string | null
          is_active?: boolean
          priority: number
          conditions: any[]
          action: string
          action_target: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          team_id?: string | null
          is_active?: boolean
          priority?: number
          conditions?: any[]
          action?: string
          action_target?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      ticket_history: {
        Row: {
          id: string
          ticket_id: string
          actor_id: string | null
          action: string
          changes: Record<string, any>
          created_at: string | null
        }
        Insert: {
          id?: string
          ticket_id: string
          actor_id?: string | null
          action: string
          changes: Record<string, any>
          created_at?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string
          actor_id?: string | null
          action?: string
          changes?: Record<string, any>
          created_at?: string | null
        }
      }
    }
    Functions: {
      evaluate_routing_rules: {
        Args: {
          ticket_data: Record<string, any>
        }
        Returns: {
          rule_id: string
          action: string
          action_target: string
        }[]
      }
    }
  }
}

export type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Team {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  metadata: Record<string, any>
}

export interface Agent {
  id: string
  name: string
  email: string
  role: 'agent' | 'admin'
  team_id: string
  created_at: string
  updated_at: string
  metadata: Record<string, any>
}

export interface Customer {
  id: string
  name: string
  email: string
  created_at: string
  updated_at: string
  metadata: Record<string, any>
}

export interface Ticket {
  id: string
  title: string
  description: string
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  closed_at: string | null
  customer_id: string
  assigned_agent_id: string | null
  team_id: string
  source: string
  tags: string[]
  metadata: Record<string, any>
  custom_fields: Record<string, any>
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
  content: string
  created_at: string
  agent_id: string | null
  is_ai: boolean
  attachments: string[]
  metadata: Record<string, any>
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