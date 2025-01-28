export interface ChatSession {
  id: string
  user_id: string
  status: 'active' | 'ended'
  created_at: string
  ended_at: string | null
  metadata: Record<string, any>
  user?: {
    id: string
    email: string
  }
  chat_messages?: ChatMessage[]
}

export interface ChatMessage {
  id: string
  session_id: string
  sender_type: 'customer' | 'agent' | 'system'
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  metadata: Record<string, any>
}

export interface RealtimePayload<T> {
  commit_timestamp: string
  errors: null | any[]
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T | null
  schema: string
  table: string
}

export interface User {
  id: string
  email: string
  name?: string
}

export interface Customer {
  id: string
  user: User
  company?: string
}

export interface Agent {
  id: string
  user: User
}

export interface Team {
  id: string
  name: string
}

export interface ExtendedTicket {
  id: string
  title: string
  description: string
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  customer_id: string
  team_id?: string
  assigned_agent_id?: string
  customer?: Customer
  team?: Team
  assigned_agent?: Agent
  last_response?: {
    author_id: string
    content: string
    created_at: string
  }
}

export interface SavedView {
  id: string
  name: string
  filters: {
    status?: string[]
    priority?: string[]
    team_id?: string
    assigned_agent_id?: string
    lastResponseBy?: 'customer' | 'agent'
  }
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
  user_id: string
  created_at: string
  updated_at: string
}

export interface Chat {
  id: string
  customer_id: string
  agent_id?: string
  status: 'active' | 'closed'
  created_at: string
  updated_at: string
  customer: Customer
  agent?: Agent
  last_message?: {
    content: string
    sender_id: string
    created_at: string
  }
} 